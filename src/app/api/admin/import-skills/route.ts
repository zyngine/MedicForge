import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SkillImportRow {
  student_email: string;
  skill_name: string;
  status: string;
  attempt_number?: string | number;
  evaluated_date?: string;
  feedback?: string;
  notes?: string;
}

interface ImportResult {
  identifier: string;
  success: boolean;
  error?: string;
}

const VALID_STATUSES = ["passed", "failed", "needs_practice"];

export async function POST(request: NextRequest) {
  try {
    const { skills, course_id, tenant_id, create_skills } = await request.json();

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ error: "No skills data provided" }, { status: 400 });
    }

    if (!tenant_id || !course_id) {
      return NextResponse.json({ error: "Tenant ID and Course ID are required" }, { status: 400 });
    }

    // Verify user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin: any = createAdminClient();

    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id ||
        !["admin", "instructor"].includes(requesterProfile.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify course exists
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, tenant_id")
      .eq("id", course_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Cache for students and skills
    const studentCache = new Map<string, string>(); // email -> id
    const skillCache = new Map<string, string>(); // name -> id

    // Pre-load students enrolled in this course
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, users!inner(id, email)")
      .eq("course_id", course_id);

    if (enrollments) {
      for (const e of enrollments) {
        const userData = e.users as unknown as { id: string; email: string };
        if (userData?.email) {
          studentCache.set(userData.email.toLowerCase(), userData.id);
        }
      }
    }

    // Pre-load skills for this tenant
    const { data: existingSkills } = await supabaseAdmin
      .from("skills")
      .select("id, name")
      .eq("tenant_id", tenant_id);

    if (existingSkills) {
      for (const s of existingSkills) {
        skillCache.set(s.name.toLowerCase(), s.id);
      }
    }

    // Get default category for creating new skills
    let defaultCategoryId: string | null = null;
    if (create_skills) {
      const { data: categories } = await supabaseAdmin
        .from("skill_categories")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("is_active", true)
        .limit(1);

      defaultCategoryId = categories?.[0]?.id || null;
    }

    const results: ImportResult[] = [];

    for (const row of skills as SkillImportRow[]) {
      const email = row.student_email?.toLowerCase().trim();
      const skillName = row.skill_name?.trim();
      const identifier = `${email} - ${skillName}`;

      try {
        // Find student
        const studentId = studentCache.get(email);
        if (!studentId) {
          results.push({
            identifier,
            success: false,
            error: `Student not found: ${email}`,
          });
          continue;
        }

        // Find or create skill
        let skillId = skillCache.get(skillName.toLowerCase());

        if (!skillId && create_skills && defaultCategoryId) {
          // Create new skill
          const { data: newSkill, error: createError } = await supabaseAdmin
            .from("skills")
            .insert({
              tenant_id,
              category_id: defaultCategoryId,
              name: skillName,
            })
            .select("id")
            .single();

          if (createError || !newSkill) {
            results.push({
              identifier,
              success: false,
              error: `Failed to create skill: ${createError?.message}`,
            });
            continue;
          }

          skillId = newSkill.id;
          skillCache.set(skillName.toLowerCase(), newSkill.id);
        }

        if (!skillId) {
          results.push({
            identifier,
            success: false,
            error: `Skill not found: ${skillName}`,
          });
          continue;
        }

        // Validate status
        const status = row.status?.toLowerCase().trim();
        if (!status || !VALID_STATUSES.includes(status)) {
          results.push({
            identifier,
            success: false,
            error: `Invalid status: ${row.status}. Use: passed, failed, or needs_practice`,
          });
          continue;
        }

        // Parse attempt number
        const attemptNumber = row.attempt_number
          ? (typeof row.attempt_number === "number" ? row.attempt_number : parseInt(String(row.attempt_number)))
          : 1;

        // Insert skill attempt
        const { error: insertError } = await supabaseAdmin
          .from("skill_attempts")
          .insert({
            tenant_id,
            course_id,
            student_id: studentId,
            skill_id: skillId,
            status: status as "passed" | "failed" | "needs_practice",
            attempt_number: isNaN(attemptNumber) ? 1 : attemptNumber,
            evaluated_at: row.evaluated_date || new Date().toISOString(),
            evaluator_id: user.id,
            feedback: row.feedback?.trim() || null,
            notes: row.notes?.trim() || null,
          });

        if (insertError) {
          results.push({
            identifier,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        results.push({ identifier, success: true });
      } catch (err) {
        results.push({
          identifier,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: skills.length,
        imported: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Skill import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

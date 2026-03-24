import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface GradeImportRow {
  student_email: string;
  assignment_name: string;
  score: string | number;
  max_score?: string | number;
  feedback?: string;
  submitted_date?: string;
  graded_date?: string;
}

interface ImportResult {
  identifier: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { grades, course_id, tenant_id, create_assignments } = await request.json();

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ error: "No grades provided" }, { status: 400 });
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

    // Get course and its modules
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, tenant_id")
      .eq("id", course_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Cache for students and assignments
    const studentCache = new Map<string, string>(); // email -> id
    const assignmentCache = new Map<string, string>(); // name -> id

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

    // Pre-load assignments for this course
    const { data: modules } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", course_id);

    if (modules && modules.length > 0) {
      const moduleIds = modules.map((m: any) => m.id);
      const { data: assignments } = await supabaseAdmin
        .from("assignments")
        .select("id, title")
        .in("module_id", moduleIds);

      if (assignments) {
        for (const a of assignments) {
          assignmentCache.set(a.title.toLowerCase(), a.id);
        }
      }
    }

    const results: ImportResult[] = [];

    for (const g of grades as GradeImportRow[]) {
      const email = g.student_email?.toLowerCase().trim();
      const assignmentName = g.assignment_name?.trim();
      const identifier = `${email} - ${assignmentName}`;

      try {
        // Find student
        let studentId = studentCache.get(email);
        if (!studentId) {
          results.push({
            identifier,
            success: false,
            error: `Student not found: ${email}`,
          });
          continue;
        }

        // Find or create assignment
        let assignmentId = assignmentCache.get(assignmentName.toLowerCase());

        if (!assignmentId && create_assignments && modules && modules.length > 0) {
          // Create new assignment in first module
          const maxScore = typeof g.max_score === "number" ? g.max_score : parseFloat(String(g.max_score)) || 100;

          const { data: newAssignment, error: createError } = await supabaseAdmin
            .from("assignments")
            .insert({
              tenant_id,
              module_id: modules[0].id,
              title: assignmentName,
              type: "written",
              points_possible: maxScore,
              is_published: true,
            })
            .select("id")
            .single();

          if (createError || !newAssignment) {
            results.push({
              identifier,
              success: false,
              error: `Failed to create assignment: ${createError?.message}`,
            });
            continue;
          }

          assignmentId = newAssignment.id;
          assignmentCache.set(assignmentName.toLowerCase(), newAssignment.id);
        }

        if (!assignmentId) {
          results.push({
            identifier,
            success: false,
            error: `Assignment not found: ${assignmentName}`,
          });
          continue;
        }

        // Parse score
        const score = typeof g.score === "number" ? g.score : parseFloat(String(g.score));
        if (isNaN(score)) {
          results.push({
            identifier,
            success: false,
            error: "Invalid score value",
          });
          continue;
        }

        // Upsert submission
        const { error: upsertError } = await supabaseAdmin
          .from("submissions")
          .upsert(
            {
              tenant_id,
              assignment_id: assignmentId,
              student_id: studentId,
              status: "graded",
              raw_score: score,
              final_score: score,
              feedback: g.feedback ? { text: g.feedback } : null,
              submitted_at: g.submitted_date || new Date().toISOString(),
              graded_at: g.graded_date || new Date().toISOString(),
              graded_by: user.id,
            },
            {
              onConflict: "assignment_id,student_id",
            }
          );

        if (upsertError) {
          results.push({
            identifier,
            success: false,
            error: upsertError.message,
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
        total: grades.length,
        imported: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Grade import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

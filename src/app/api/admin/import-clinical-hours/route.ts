import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface ClinicalHoursImportRow {
  student_email: string;
  date: string;
  hours: string | number;
  site_name?: string;
  site_type?: string;
  supervisor_name?: string;
  supervisor_credentials?: string;
  was_team_lead?: string;
  notes?: string;
  verification_status?: string;
}

interface ImportResult {
  identifier: string;
  success: boolean;
  error?: string;
}

const VALID_SITE_TYPES = ["ambulance", "hospital", "clinic", "fire_department", "rescue_squad", "other"];
const VALID_STATUSES = ["pending", "verified", "rejected"];

export async function POST(request: NextRequest) {
  try {
    const { clinical_hours, course_id, tenant_id } = await request.json();

    if (!clinical_hours || !Array.isArray(clinical_hours) || clinical_hours.length === 0) {
      return NextResponse.json({ error: "No clinical hours data provided" }, { status: 400 });
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

    // Cache for students
    const studentCache = new Map<string, string>(); // email -> id

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

    const results: ImportResult[] = [];

    for (const row of clinical_hours as ClinicalHoursImportRow[]) {
      const email = row.student_email?.toLowerCase().trim();
      const date = row.date?.trim();
      const identifier = `${email} - ${date}`;

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

        // Parse hours
        const hours = typeof row.hours === "number" ? row.hours : parseFloat(String(row.hours));
        if (isNaN(hours) || hours < 0) {
          results.push({
            identifier,
            success: false,
            error: "Invalid hours value",
          });
          continue;
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          results.push({
            identifier,
            success: false,
            error: "Invalid date format. Use YYYY-MM-DD",
          });
          continue;
        }

        // Validate site_type if provided
        const siteType = row.site_type?.toLowerCase().trim();
        if (siteType && !VALID_SITE_TYPES.includes(siteType)) {
          // Just warn but continue - we'll use the value anyway
        }

        // Parse was_team_lead
        const wasTeamLead = row.was_team_lead?.toLowerCase().trim() === "true" ||
                           row.was_team_lead?.toLowerCase().trim() === "yes" ||
                           row.was_team_lead === "1";

        // Parse verification status
        let verificationStatus: "pending" | "verified" | "rejected" = "pending";
        if (row.verification_status?.toLowerCase().trim()) {
          const status = row.verification_status.toLowerCase().trim();
          if (VALID_STATUSES.includes(status)) {
            verificationStatus = status as "pending" | "verified" | "rejected";
          }
        }

        // Insert clinical log
        const { error: insertError } = await supabaseAdmin
          .from("clinical_logs")
          .insert({
            tenant_id,
            course_id,
            student_id: studentId,
            date,
            hours,
            log_type: "hours" as const,
            site_name: row.site_name?.trim() || null,
            site_type: siteType || null,
            supervisor_name: row.supervisor_name?.trim() || null,
            supervisor_credentials: row.supervisor_credentials?.trim() || null,
            was_team_lead: wasTeamLead,
            notes: row.notes?.trim() || null,
            verification_status: verificationStatus,
            verified_by: verificationStatus === "verified" ? user.id : null,
            verified_at: verificationStatus === "verified" ? new Date().toISOString() : null,
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
        total: clinical_hours.length,
        imported: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Clinical hours import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

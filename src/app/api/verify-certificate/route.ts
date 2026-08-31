import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";

// Public certificate verification — anyone with a verification code can verify
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing verification code" }, { status: 400 });
    }

    // The lookups below are case-insensitive because codes have been stored in
    // both cases. ilike treats % and _ as wildcards, so an unfiltered code
    // would let anyone walk the certificate table a character at a time.
    // Verification codes are hex, so reject anything else outright.
    if (!/^[A-Za-z0-9-]{6,64}$/.test(code)) {
      return NextResponse.json({ valid: false, message: "Certificate not found" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createCEAdminClient();

    // Try LMS certificates first (case-insensitive — codes may be stored upper or lower)
    const { data: lmsData } = await admin
      .from("certificates")
      .select(`
        *,
        student:users!certificates_student_id_fkey(id, full_name),
        course:courses(id, title, course_type),
        tenant:tenants(id, name, logo_url)
      `)
      .ilike("verification_code", code)
      .maybeSingle();

    if (lmsData) {
      if (lmsData.is_revoked) {
        return NextResponse.json({
          valid: false,
          message: "This certificate has been revoked",
          revokedAt: lmsData.revoked_at,
          reason: lmsData.revoked_reason,
        });
      }
      if (lmsData.expires_at && new Date(lmsData.expires_at) < new Date()) {
        return NextResponse.json({
          valid: false,
          message: "This certificate has expired",
          expiredAt: lmsData.expires_at,
        });
      }
      // Public endpoint: return only what a verifier needs to confirm the
      // certificate is genuine, never the whole row.
      return NextResponse.json({
        valid: true,
        certificate: {
          id: lmsData.id,
          certificate_number: lmsData.certificate_number,
          certificate_type: lmsData.certificate_type,
          title: lmsData.title,
          issued_at: lmsData.issued_at,
          expires_at: lmsData.expires_at,
          completion_date: lmsData.completion_date,
          final_grade: lmsData.final_grade,
          hours_completed: lmsData.hours_completed,
          verification_code: lmsData.verification_code,
          is_revoked: false,
          student: lmsData.student
            ? { id: lmsData.student.id, full_name: lmsData.student.full_name }
            : null,
          course: lmsData.course,
          tenant: lmsData.tenant,
        },
      });
    }

    // Try CE certificates
    const { data: ceData } = await admin
      .from("ce_certificates")
      .select(`
        *,
        student:ce_users!ce_certificates_user_id_fkey(id, first_name, last_name),
        course:ce_courses!ce_certificates_course_id_fkey(id, title, ceh_hours)
      `)
      .ilike("verification_code", code)
      .maybeSingle();

    if (!ceData) {
      return NextResponse.json({ valid: false, message: "Certificate not found" });
    }

    if (ceData.expires_at && new Date(ceData.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        message: "This certificate has expired",
        expiredAt: ceData.expires_at,
      });
    }

    const studentFullName = ceData.student
      ? `${ceData.student.first_name || ""} ${ceData.student.last_name || ""}`.trim() || ceData.user_name
      : ceData.user_name;

    const certificate = {
      id: ceData.id,
      tenant_id: "",
      student_id: ceData.user_id,
      course_id: ceData.course_id,
      certificate_number: ceData.certificate_number,
      certificate_type: "ce_completion",
      title: `CE Certificate - ${ceData.course_title}`,
      issued_at: ceData.issued_at,
      expires_at: ceData.expires_at || null,
      completion_date: ceData.completion_date,
      final_grade: null,
      hours_completed: Number(ceData.ceh_hours),
      template_id: null,
      custom_data: {},
      verification_code: ceData.verification_code,
      is_revoked: false,
      revoked_at: null,
      revoked_reason: null,
      issued_by: null,
      pdf_url: ceData.pdf_url || null,
      created_at: ceData.issued_at,
      updated_at: ceData.issued_at,
      // The holder's email is deliberately omitted — this endpoint is
      // unauthenticated and anyone with a code can call it.
      student: {
        id: ceData.user_id,
        full_name: studentFullName,
      },
      course: ceData.course
        ? { id: ceData.course.id, title: ceData.course.title, course_type: "ce" }
        : { id: ceData.course_id, title: ceData.course_title, course_type: "ce" },
      tenant: { id: "", name: ceData.provider_name || "MedicForge", logo_url: "" },
    };

    return NextResponse.json({ valid: true, certificate });
  } catch (err) {
    console.error("[verify-certificate]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

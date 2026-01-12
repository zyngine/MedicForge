import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, type APIContext } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ studentId: string }>;
}

/**
 * GET /api/v1/students/:studentId
 * Get a single student with their enrollments and progress
 */
async function handleGet(request: NextRequest, context: APIContext, { params }: RouteParams) {
  const { studentId } = await params;
  const supabase = await createClient();

  // Get student
  const { data: student, error } = await supabase
    .from("users")
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", studentId)
    .eq("tenant_id", context.tenantId)
    .eq("role", "student")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return apiError("Student not found", 404);
    }
    return apiError(error.message, 500);
  }

  // Get enrollments with course info
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      course_id,
      enrolled_at,
      status,
      completion_percentage,
      final_grade,
      course:courses!enrollments_course_id_fkey(id, title, course_type)
    `)
    .eq("student_id", studentId)
    .eq("tenant_id", context.tenantId);

  // Get submission stats
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, final_score")
    .eq("student_id", studentId)
    .eq("tenant_id", context.tenantId);

  const submissionStats = {
    total: submissions?.length || 0,
    graded: submissions?.filter(s => s.status === "graded").length || 0,
    pending: submissions?.filter(s => s.status === "submitted").length || 0,
    average_score: submissions
      ?.filter(s => s.final_score !== null)
      .reduce((sum, s, _, arr) => sum + (s.final_score || 0) / arr.length, 0) || 0,
  };

  // Get clinical hours
  const { data: clinicalLogs } = await supabase
    .from("clinical_logs")
    .select("hours, verification_status")
    .eq("student_id", studentId)
    .eq("tenant_id", context.tenantId)
    .eq("log_type", "hours");

  const clinicalStats = {
    total_hours: clinicalLogs?.reduce((sum, l) => sum + (l.hours || 0), 0) || 0,
    verified_hours: clinicalLogs
      ?.filter(l => l.verification_status === "verified")
      .reduce((sum, l) => sum + (l.hours || 0), 0) || 0,
  };

  return apiSuccess({
    ...student,
    enrollments: enrollments || [],
    stats: {
      submissions: submissionStats,
      clinical: clinicalStats,
    },
  });
}

export const GET = (request: NextRequest, routeParams: RouteParams) =>
  withAPIAuth((req, ctx) => handleGet(req, ctx, routeParams), ["read", "students:read"])(request);

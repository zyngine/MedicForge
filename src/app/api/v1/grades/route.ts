import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, getPagination, type APIContext } from "@/lib/api/auth";

/**
 * GET /api/v1/grades
 * Get grades for students in the tenant
 */
async function handleGet(request: NextRequest, context: APIContext) {
  const supabase = await createClient();
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);

  // Optional filters
  const studentId = url.searchParams.get("student_id");
  const courseId = url.searchParams.get("course_id");

  // Build query to get all graded submissions
  let query = supabase
    .from("submissions")
    .select(`
      id,
      assignment_id,
      student_id,
      attempt_number,
      raw_score,
      curved_score,
      final_score,
      graded_at,
      feedback,
      student:users!submissions_student_id_fkey(id, full_name, email),
      assignment:assignments!submissions_assignment_id_fkey(
        id,
        title,
        type,
        points_possible,
        module_id,
        module:modules!assignments_module_id_fkey(
          id,
          title,
          course_id
        )
      )
    `, { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .eq("status", "graded")
    .order("graded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data: grades, count, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  // Filter by course if specified (need to do post-query since it's nested)
  let filteredGrades = grades || [];
  if (courseId) {
    filteredGrades = filteredGrades.filter((g: any) =>
      g.assignment?.module?.course_id === courseId
    );
  }

  // Transform to cleaner format
  const transformedGrades = filteredGrades.map((g: any) => ({
    id: g.id,
    student: g.student,
    assignment: {
      id: g.assignment?.id,
      title: g.assignment?.title,
      type: g.assignment?.type,
      points_possible: g.assignment?.points_possible,
      course_id: g.assignment?.module?.course_id,
    },
    attempt_number: g.attempt_number,
    raw_score: g.raw_score,
    curved_score: g.curved_score,
    final_score: g.final_score,
    percentage: g.assignment?.points_possible
      ? Math.round((g.final_score / g.assignment.points_possible) * 100)
      : null,
    graded_at: g.graded_at,
    feedback: g.feedback,
  }));

  return apiSuccess(transformedGrades, {
    page,
    limit,
    total: count || 0,
  });
}

/**
 * POST /api/v1/grades
 * Submit a grade for a submission
 */
async function handlePost(request: NextRequest, context: APIContext) {
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { submission_id, score, feedback } = body;

  if (!submission_id) {
    return apiError("submission_id is required", 400);
  }

  if (score === undefined || score === null) {
    return apiError("score is required", 400);
  }

  // Verify submission exists and belongs to tenant
  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select(`
      id,
      assignment:assignments!submissions_assignment_id_fkey(points_possible)
    `)
    .eq("id", submission_id)
    .eq("tenant_id", context.tenantId)
    .single();

  if (subError || !submission) {
    return apiError("Submission not found", 404);
  }

  // Validate score
  const maxPoints = (submission.assignment as any)?.points_possible || 100;
  if (score < 0 || score > maxPoints) {
    return apiError(`Score must be between 0 and ${maxPoints}`, 400);
  }

  // Update the submission with the grade
  const { data: updatedSubmission, error: updateError } = await supabase
    .from("submissions")
    .update({
      raw_score: score,
      final_score: score,
      status: "graded",
      graded_at: new Date().toISOString(),
      feedback: feedback ? { text: feedback } : null,
    })
    .eq("id", submission_id)
    .select(`
      id,
      raw_score,
      final_score,
      status,
      graded_at,
      feedback,
      student:users!submissions_student_id_fkey(id, full_name, email),
      assignment:assignments!submissions_assignment_id_fkey(id, title, points_possible)
    `)
    .single();

  if (updateError) {
    return apiError(updateError.message, 500);
  }

  return apiSuccess(updatedSubmission);
}

export const GET = withAPIAuth(handleGet, ["read", "grades:read"]);
export const POST = withAPIAuth(handlePost, ["write", "grades:write"]);

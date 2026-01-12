import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, getPagination, type APIContext } from "@/lib/api/auth";

/**
 * GET /api/v1/submissions
 * List all submissions for the tenant
 */
async function handleGet(request: NextRequest, context: APIContext) {
  const supabase = await createClient();
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);

  // Optional filters
  const studentId = url.searchParams.get("student_id");
  const assignmentId = url.searchParams.get("assignment_id");
  const status = url.searchParams.get("status");

  let query = supabase
    .from("submissions")
    .select(`
      id,
      assignment_id,
      student_id,
      attempt_number,
      status,
      started_at,
      submitted_at,
      raw_score,
      curved_score,
      final_score,
      graded_at,
      graded_by,
      student:users!submissions_student_id_fkey(id, full_name, email),
      assignment:assignments!submissions_assignment_id_fkey(id, title, type, points_possible)
    `, { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (studentId) {
    query = query.eq("student_id", studentId);
  }
  if (assignmentId) {
    query = query.eq("assignment_id", assignmentId);
  }
  if (status) {
    query = query.eq("status", status as "in_progress" | "submitted" | "graded" | "returned");
  }

  const { data: submissions, count, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess(submissions, {
    page,
    limit,
    total: count || 0,
  });
}

/**
 * POST /api/v1/submissions
 * Create a new submission or update grade
 */
async function handlePost(request: NextRequest, context: APIContext) {
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { assignment_id, student_id, content, final_score, feedback } = body;

  if (!assignment_id || !student_id) {
    return apiError("assignment_id and student_id are required", 400);
  }

  // Verify assignment exists and belongs to tenant
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, points_possible")
    .eq("id", assignment_id)
    .eq("tenant_id", context.tenantId)
    .single();

  if (assignmentError || !assignment) {
    return apiError("Assignment not found", 404);
  }

  // Verify student exists and belongs to tenant
  const { data: student, error: studentError } = await supabase
    .from("users")
    .select("id")
    .eq("id", student_id)
    .eq("tenant_id", context.tenantId)
    .single();

  if (studentError || !student) {
    return apiError("Student not found", 404);
  }

  // Check for existing submission
  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id, attempt_number")
    .eq("assignment_id", assignment_id)
    .eq("student_id", student_id)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .single();

  // If grading an existing submission
  if (existingSubmission && final_score !== undefined) {
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("submissions")
      .update({
        final_score,
        raw_score: final_score,
        status: "graded",
        graded_at: new Date().toISOString(),
        feedback: feedback ? { text: feedback } : null,
      })
      .eq("id", existingSubmission.id)
      .select()
      .single();

    if (updateError) {
      return apiError(updateError.message, 500);
    }

    return apiSuccess(updatedSubmission);
  }

  // Create new submission
  const attemptNumber = existingSubmission ? (existingSubmission.attempt_number || 0) + 1 : 1;

  const { data: submission, error: createError } = await supabase
    .from("submissions")
    .insert([{
      tenant_id: context.tenantId,
      assignment_id,
      student_id,
      attempt_number: attemptNumber,
      content: content || null,
      status: content ? "submitted" : "in_progress",
      started_at: new Date().toISOString(),
      submitted_at: content ? new Date().toISOString() : null,
    }])
    .select()
    .single();

  if (createError) {
    return apiError(createError.message, 500);
  }

  return NextResponse.json({ data: submission }, { status: 201 });
}

export const GET = withAPIAuth(handleGet, ["read", "submissions:read"]);
export const POST = withAPIAuth(handlePost, ["write", "submissions:write"]);

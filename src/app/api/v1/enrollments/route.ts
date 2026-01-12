import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, getPagination, type APIContext } from "@/lib/api/auth";

/**
 * GET /api/v1/enrollments
 * List all enrollments for the tenant
 */
async function handleGet(request: NextRequest, context: APIContext) {
  const supabase = await createClient();
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);

  // Optional filters
  const courseId = url.searchParams.get("course_id");
  const studentId = url.searchParams.get("student_id");
  const status = url.searchParams.get("status");

  let query = supabase
    .from("enrollments")
    .select(`
      id,
      course_id,
      student_id,
      enrolled_at,
      status,
      completion_percentage,
      final_grade,
      created_at,
      student:users!enrollments_student_id_fkey(id, full_name, email),
      course:courses!enrollments_course_id_fkey(id, title, course_type)
    `, { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .order("enrolled_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (courseId) {
    query = query.eq("course_id", courseId);
  }
  if (studentId) {
    query = query.eq("student_id", studentId);
  }
  if (status) {
    query = query.eq("status", status as "active" | "completed" | "dropped");
  }

  const { data: enrollments, count, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess(enrollments, {
    page,
    limit,
    total: count || 0,
  });
}

/**
 * POST /api/v1/enrollments
 * Create a new enrollment (enroll a student in a course)
 */
async function handlePost(request: NextRequest, context: APIContext) {
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { course_id, student_id, enrollment_code } = body;

  // Either course_id or enrollment_code is required
  if (!course_id && !enrollment_code) {
    return apiError("course_id or enrollment_code is required", 400);
  }

  if (!student_id) {
    return apiError("student_id is required", 400);
  }

  // If enrollment_code provided, look up the course
  let targetCourseId = course_id;
  if (enrollment_code && !course_id) {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("enrollment_code", enrollment_code)
      .eq("is_active", true)
      .single();

    if (courseError || !course) {
      return apiError("Invalid enrollment code", 400);
    }
    targetCourseId = course.id;
  }

  // Verify the course belongs to this tenant
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, max_students")
    .eq("id", targetCourseId)
    .eq("tenant_id", context.tenantId)
    .single();

  if (courseError || !course) {
    return apiError("Course not found", 404);
  }

  // Verify the student belongs to this tenant
  const { data: student, error: studentError } = await supabase
    .from("users")
    .select("id")
    .eq("id", student_id)
    .eq("tenant_id", context.tenantId)
    .single();

  if (studentError || !student) {
    return apiError("Student not found", 404);
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", targetCourseId)
    .eq("student_id", student_id)
    .single();

  if (existingEnrollment) {
    return apiError("Student is already enrolled in this course", 409);
  }

  // Check max students
  if (course.max_students) {
    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", targetCourseId);

    if (enrollmentCount && enrollmentCount >= course.max_students) {
      return apiError("Course is full", 400);
    }
  }

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .insert([{
      tenant_id: context.tenantId,
      course_id: targetCourseId,
      student_id,
      status: "active",
      completion_percentage: 0,
    }])
    .select(`
      id,
      course_id,
      student_id,
      enrolled_at,
      status,
      completion_percentage,
      student:users!enrollments_student_id_fkey(id, full_name, email),
      course:courses!enrollments_course_id_fkey(id, title, course_type)
    `)
    .single();

  if (enrollError) {
    return apiError(enrollError.message, 500);
  }

  return NextResponse.json({ data: enrollment }, { status: 201 });
}

export const GET = withAPIAuth(handleGet, ["read", "enrollments:read"]);
export const POST = withAPIAuth(handlePost, ["write", "enrollments:write"]);

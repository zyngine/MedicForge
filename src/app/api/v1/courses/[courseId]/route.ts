import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, type APIContext } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/v1/courses/:courseId
 * Get a single course by ID
 */
async function handleGet(request: NextRequest, context: APIContext, { params }: RouteParams) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      course_code,
      course_type,
      instructor_id,
      enrollment_code,
      start_date,
      end_date,
      max_students,
      settings,
      is_active,
      is_archived,
      created_at,
      updated_at,
      instructor:users!courses_instructor_id_fkey(id, full_name, email),
      modules:modules(
        id,
        title,
        description,
        order_index,
        is_published
      )
    `)
    .eq("id", courseId)
    .eq("tenant_id", context.tenantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return apiError("Course not found", 404);
    }
    return apiError(error.message, 500);
  }

  // Get enrollment count
  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  return apiSuccess(Object.assign({}, course, { enrollment_count: enrollmentCount || 0 }));
}

export const GET = (request: NextRequest, routeParams: RouteParams) =>
  withAPIAuth((req, ctx) => handleGet(req, ctx, routeParams), ["read", "courses:read"])(request);

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, getPagination, type APIContext } from "@/lib/api/auth";

/**
 * GET /api/v1/courses
 * List all courses for the tenant
 */
async function handleGet(request: NextRequest, context: APIContext) {
  const supabase = await createClient();
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);

  // Optional filters
  const courseType = url.searchParams.get("type");
  const isActive = url.searchParams.get("active");
  const instructorId = url.searchParams.get("instructor_id");

  let query = supabase
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
      is_active,
      is_archived,
      created_at,
      updated_at,
      instructor:users!courses_instructor_id_fkey(id, full_name, email)
    `, { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (courseType) {
    query = query.eq("course_type", courseType as "EMR" | "EMT" | "AEMT" | "Paramedic" | "Custom");
  }
  if (isActive === "true") {
    query = query.eq("is_active", true).eq("is_archived", false);
  } else if (isActive === "false") {
    query = query.eq("is_active", false);
  }
  if (instructorId) {
    query = query.eq("instructor_id", instructorId);
  }

  const { data: courses, count, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess(courses, {
    page,
    limit,
    total: count || 0,
  });
}

export const GET = withAPIAuth(handleGet, ["read", "courses:read"]);

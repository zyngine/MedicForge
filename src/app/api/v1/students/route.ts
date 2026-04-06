import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAPIAuth, apiSuccess, apiError, getPagination, type APIContext } from "@/lib/api/auth";

/**
 * GET /api/v1/students
 * List all students for the tenant
 */
async function handleGet(request: NextRequest, context: APIContext) {
  const supabase = await createClient();
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);

  // Optional filters
  const courseId = url.searchParams.get("course_id");
  const isActive = url.searchParams.get("active");
  const search = url.searchParams.get("search");

  let query = supabase
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
    `, { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .eq("role", "student")
    .order("full_name", { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (isActive === "true") {
    query = query.eq("is_active", true);
  } else if (isActive === "false") {
    query = query.eq("is_active", false);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: students, count, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  // If filtering by course, get only enrolled students
  if (courseId && students) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("tenant_id", context.tenantId);

    const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
    const filteredStudents = students.filter(s => enrolledIds.has(s.id));

    return apiSuccess(filteredStudents, {
      page,
      limit,
      total: filteredStudents.length,
    });
  }

  return apiSuccess(students, {
    page,
    limit,
    total: count || 0,
  });
}

export const GET = withAPIAuth(handleGet, ["read", "students:read"]);

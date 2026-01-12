"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

export interface CourseWithDetails extends Course {
  instructor?: {
    id: string;
    full_name: string;
    email: string;
  };
  enrollment_count?: number;
  enrollments_count?: number; // Alias for backward compatibility
  module_count?: number;
  modules_count?: number; // Alias for backward compatibility
}

/**
 * Generate a unique enrollment code
 */
export function generateEnrollmentCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get all courses with optional filters
 */
export function useCourses(options?: {
  instructorId?: string;
  isActive?: boolean;
  isArchived?: boolean;
  includeArchived?: boolean;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["courses", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      let query = supabase
        .from("courses")
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (options?.instructorId) {
        query = query.eq("instructor_id", options.instructorId);
      }
      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }
      if (!options?.includeArchived && options?.isArchived === undefined) {
        query = query.eq("is_archived", false);
      } else if (options?.isArchived !== undefined) {
        query = query.eq("is_archived", options.isArchived);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get enrollment counts for each course
      const courseIds = data?.map((c) => c.id) || [];
      if (courseIds.length === 0) return [];

      const { data: enrollmentCounts } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("status", "active");

      const countMap = new Map<string, number>();
      enrollmentCounts?.forEach((e) => {
        countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1);
      });

      // Get module counts
      const { data: moduleCounts } = await supabase
        .from("modules")
        .select("course_id")
        .in("course_id", courseIds);

      const moduleCountMap = new Map<string, number>();
      moduleCounts?.forEach((m) => {
        moduleCountMap.set(m.course_id, (moduleCountMap.get(m.course_id) || 0) + 1);
      });

      return data.map((course) => {
        const enrollmentCount = countMap.get(course.id) || 0;
        const moduleCount = moduleCountMap.get(course.id) || 0;
        return {
          ...course,
          enrollment_count: enrollmentCount,
          enrollments_count: enrollmentCount, // Alias
          module_count: moduleCount,
          modules_count: moduleCount, // Alias
        };
      }) as CourseWithDetails[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get courses for the current instructor
 */
export function useInstructorCourses() {
  const { user } = useUser();

  return useCourses({
    instructorId: user?.id,
    isArchived: false,
  });
}

/**
 * Get a single course by ID
 */
export function useCourse(courseId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      if (!courseId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email)
        `)
        .eq("id", courseId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;

      // Get enrollment count
      const { count: enrollmentCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("status", "active");

      // Get module count
      const { count: moduleCount } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);

      return {
        ...data,
        enrollment_count: enrollmentCount || 0,
        enrollments_count: enrollmentCount || 0, // Alias
        module_count: moduleCount || 0,
        modules_count: moduleCount || 0, // Alias
      } as CourseWithDetails;
    },
    enabled: !!courseId && !!tenant?.id,
  });
}

/**
 * Create a new course
 */
export function useCreateCourse() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<CourseInsert, "tenant_id" | "instructor_id" | "enrollment_code"> & {
        enrollment_code?: string;
      }
    ) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Generate enrollment code if not provided
      let enrollmentCode = input.enrollment_code || generateEnrollmentCode();

      // Ensure unique enrollment code
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("enrollment_code", enrollmentCode)
          .single();

        if (!existing) {
          isUnique = true;
        } else {
          enrollmentCode = generateEnrollmentCode();
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error("Could not generate unique enrollment code");
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          ...input,
          tenant_id: tenant.id,
          instructor_id: user.id,
          enrollment_code: enrollmentCode,
        })
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as CourseWithDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Update a course
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      updates,
    }: {
      courseId: string;
      updates: CourseUpdate;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId)
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as CourseWithDetails;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Archive a course (soft delete)
 */
export function useArchiveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("courses")
        .update({ is_archived: true, is_active: false })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Restore an archived course
 */
export function useRestoreCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("courses")
        .update({ is_archived: false, is_active: true })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Delete a course permanently (admin only)
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Regenerate enrollment code for a course
 */
export function useRegenerateEnrollmentCode() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Generate unique code
      let enrollmentCode = generateEnrollmentCode();
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("enrollment_code", enrollmentCode)
          .neq("id", courseId)
          .single();

        if (!existing) {
          isUnique = true;
        } else {
          enrollmentCode = generateEnrollmentCode();
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error("Could not generate unique enrollment code");
      }

      const { data, error } = await supabase
        .from("courses")
        .update({ enrollment_code: enrollmentCode })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Get course by enrollment code
 */
export function useCourseByEnrollmentCode(code: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["course-by-code", code],
    queryFn: async () => {
      if (!code || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email)
        `)
        .eq("tenant_id", tenant.id)
        .eq("enrollment_code", code.toUpperCase())
        .eq("is_active", true)
        .eq("is_archived", false)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as CourseWithDetails | null;
    },
    enabled: !!code && code.length >= 6 && !!tenant?.id,
  });
}

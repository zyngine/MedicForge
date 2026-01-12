"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"];

export interface EnrollmentWithDetails extends Enrollment {
  course?: {
    id: string;
    title: string;
    description: string | null;
    course_code: string | null;
    course_type: string;
    start_date: string | null;
    end_date: string | null;
    enrollment_code: string;
    instructor?: {
      id: string;
      full_name: string;
      email: string;
    };
    module_count?: number;
    modules_count?: number; // Alias for backward compatibility
  };
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Get enrollments with optional filters
 */
export function useEnrollments(options?: {
  courseId?: string;
  studentId?: string;
  status?: "active" | "completed" | "dropped";
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["enrollments", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      let query = supabase
        .from("enrollments")
        .select(`
          *,
          course:courses(
            id,
            title,
            description,
            course_code,
            course_type,
            start_date,
            end_date,
            enrollment_code,
            instructor:users!courses_instructor_id_fkey(id, full_name, email)
          ),
          student:users!enrollments_student_id_fkey(id, full_name, email)
        `)
        .eq("tenant_id", tenant.id)
        .order("enrolled_at", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get module counts for courses
      const courseIds = [...new Set(data?.map((e) => e.course_id) || [])];
      if (courseIds.length > 0) {
        const { data: moduleCounts } = await supabase
          .from("modules")
          .select("course_id")
          .in("course_id", courseIds);

        const moduleCountMap = new Map<string, number>();
        moduleCounts?.forEach((m) => {
          moduleCountMap.set(m.course_id, (moduleCountMap.get(m.course_id) || 0) + 1);
        });

        return data?.map((enrollment: any) => {
          const moduleCount = moduleCountMap.get(enrollment.course_id) || 0;
          return {
            ...enrollment,
            course: enrollment.course
              ? {
                  ...enrollment.course,
                  module_count: moduleCount,
                  modules_count: moduleCount, // Alias
                }
              : undefined,
          };
        }) as EnrollmentWithDetails[];
      }

      return data as EnrollmentWithDetails[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get current student's enrollments
 */
export function useMyEnrollments() {
  const { user } = useUser();

  return useEnrollments({
    studentId: user?.id,
    status: "active",
  });
}

/**
 * Get enrollments for a specific course (instructor view)
 */
export function useCourseEnrollments(courseId: string | null | undefined) {
  return useEnrollments({
    courseId: courseId || undefined,
  });
}

/**
 * Enroll student by enrollment code
 */
export function useEnrollByCode() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentCode: string) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Find course by enrollment code
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, max_students, title")
        .eq("enrollment_code", enrollmentCode.toUpperCase())
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .eq("is_archived", false)
        .single();

      if (courseError || !course) {
        throw new Error("Invalid enrollment code");
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", course.id)
        .eq("student_id", user.id)
        .single();

      if (existingEnrollment) {
        if (existingEnrollment.status === "active") {
          throw new Error("You are already enrolled in this course");
        } else if (existingEnrollment.status === "dropped") {
          // Re-enroll
          const { data, error } = await supabase
            .from("enrollments")
            .update({ status: "active" })
            .eq("id", existingEnrollment.id)
            .select()
            .single();

          if (error) throw error;
          return { enrollment: data, course };
        }
      }

      // Check if course is full
      if (course.max_students) {
        const { count } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", course.id)
          .eq("status", "active");

        if (count && count >= course.max_students) {
          throw new Error("This course is full");
        }
      }

      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          tenant_id: tenant.id,
          course_id: course.id,
          student_id: user.id,
          status: "active",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (enrollError) throw enrollError;
      return { enrollment, course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Drop a course (student)
 */
export function useDropCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("enrollments")
        .update({ status: "dropped" })
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Update enrollment status (instructor)
 */
export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      status,
      finalGrade,
    }: {
      enrollmentId: string;
      status: "active" | "completed" | "dropped";
      finalGrade?: number;
    }) => {
      const supabase = createClient();

      const updates: any = { status };
      if (finalGrade !== undefined) {
        updates.final_grade = finalGrade;
      }
      if (status === "completed") {
        updates.completion_percentage = 100;
      }

      const { data, error } = await supabase
        .from("enrollments")
        .update(updates)
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Remove student from course (instructor)
 */
export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Manually enroll a student (instructor)
 */
export function useEnrollStudent() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      studentId,
    }: {
      courseId: string;
      studentId: string;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Check if already enrolled
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .single();

      if (existing) {
        if (existing.status === "active") {
          throw new Error("Student is already enrolled");
        }
        // Re-activate dropped enrollment
        const { data, error } = await supabase
          .from("enrollments")
          .update({ status: "active" })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new enrollment
      const { data, error } = await supabase
        .from("enrollments")
        .insert({
          tenant_id: tenant.id,
          course_id: courseId,
          student_id: studentId,
          status: "active",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Update enrollment progress
 */
export function useUpdateEnrollmentProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      completionPercentage,
    }: {
      enrollmentId: string;
      completionPercentage: number;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("enrollments")
        .update({
          completion_percentage: Math.min(100, Math.max(0, completionPercentage)),
        })
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Get single enrollment
 */
export function useEnrollment(enrollmentId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["enrollment", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          course:courses(
            id,
            title,
            description,
            course_code,
            course_type,
            start_date,
            end_date,
            enrollment_code,
            instructor:users!courses_instructor_id_fkey(id, full_name, email)
          ),
          student:users!enrollments_student_id_fkey(id, full_name, email)
        `)
        .eq("id", enrollmentId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as EnrollmentWithDetails;
    },
    enabled: !!enrollmentId && !!tenant?.id,
  });
}

/**
 * Check if current user is enrolled in a course
 */
export function useIsEnrolled(courseId: string | undefined) {
  const { user } = useUser();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["is-enrolled", courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!courseId && !!user?.id && !!tenant?.id,
  });
}

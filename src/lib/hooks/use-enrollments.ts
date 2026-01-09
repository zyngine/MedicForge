"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enrollment, Course, User } from "@/types";

export interface EnrollmentWithDetails extends Enrollment {
  course?: Course & {
    instructor?: Pick<User, "id" | "full_name" | "email">;
    modules_count?: number;
  };
  student?: Pick<User, "id" | "full_name" | "email">;
}

interface UseEnrollmentsOptions {
  courseId?: string;
  studentId?: string;
  status?: "active" | "completed" | "dropped";
}

export function useEnrollments(options: UseEnrollmentsOptions = {}) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchEnrollments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("enrollments")
        .select(`
          *,
          course:courses(
            *,
            instructor:users!courses_instructor_id_fkey(id, full_name, email),
            modules:modules(count)
          ),
          student:users!enrollments_student_id_fkey(id, full_name, email)
        `)
        .order("enrolled_at", { ascending: false });

      if (options.courseId) {
        query = query.eq("course_id", options.courseId);
      }

      if (options.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      if (options.status) {
        query = query.eq("status", options.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data
      const transformedEnrollments: EnrollmentWithDetails[] = (data || []).map((enrollment: any) => ({
        ...enrollment,
        course: enrollment.course ? {
          ...enrollment.course,
          instructor: enrollment.course.instructor || undefined,
          modules_count: enrollment.course.modules?.[0]?.count || 0,
        } : undefined,
        student: enrollment.student || undefined,
      }));

      setEnrollments(transformedEnrollments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch enrollments"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.courseId, options.studentId, options.status]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Enroll a student by enrollment code
  const enrollByCode = async (enrollmentCode: string): Promise<Enrollment | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Find course by enrollment code
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, max_students, title")
        .eq("enrollment_code", enrollmentCode.toUpperCase())
        .eq("tenant_id", userData.tenant_id)
        .eq("is_active", true)
        .eq("is_archived", false)
        .single();

      if (courseError || !course) {
        throw new Error("Invalid enrollment code");
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", course.id)
        .eq("student_id", user.id)
        .single();

      if (existingEnrollment) {
        throw new Error("You are already enrolled in this course");
      }

      // Check if course is full
      if (course.max_students) {
        const { count } = await supabase
          .from("enrollments")
          .select("id", { count: "exact" })
          .eq("course_id", course.id)
          .eq("status", "active");

        if (count && count >= course.max_students) {
          throw new Error("This course is full");
        }
      }

      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .insert([{
          tenant_id: userData.tenant_id,
          course_id: course.id,
          student_id: user.id,
          status: "active",
          completion_percentage: 0,
        }])
        .select()
        .single();

      if (enrollError) throw enrollError;

      await fetchEnrollments();
      return enrollment as Enrollment;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to enroll";
      setError(new Error(message));
      throw err;
    }
  };

  // Drop a course (student)
  const dropCourse = async (enrollmentId: string): Promise<boolean> => {
    try {
      const { error: dropError } = await supabase
        .from("enrollments")
        .update({ status: "dropped" })
        .eq("id", enrollmentId);

      if (dropError) throw dropError;

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId ? { ...e, status: "dropped" as const } : e
        )
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to drop course"));
      return false;
    }
  };

  // Update enrollment status (instructor)
  const updateEnrollmentStatus = async (
    enrollmentId: string,
    status: "active" | "completed" | "dropped"
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("enrollments")
        .update({ status })
        .eq("id", enrollmentId);

      if (updateError) throw updateError;

      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status } : e))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update enrollment"));
      return false;
    }
  };

  // Remove student from course (instructor)
  const removeStudent = async (enrollmentId: string): Promise<boolean> => {
    try {
      const { error: removeError } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (removeError) throw removeError;

      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to remove student"));
      return false;
    }
  };

  return {
    enrollments,
    isLoading,
    error,
    refetch: fetchEnrollments,
    enrollByCode,
    dropCourse,
    updateEnrollmentStatus,
    removeStudent,
  };
}

// Hook for current student's enrollments
export function useMyEnrollments() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setStudentId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return useEnrollments({ studentId: studentId || undefined, status: "active" });
}

// Hook for getting enrollments for a specific course (instructor view)
export function useCourseEnrollments(courseId: string | null) {
  return useEnrollments({ courseId: courseId || undefined });
}

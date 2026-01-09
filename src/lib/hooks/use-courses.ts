"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateEnrollmentCode } from "@/lib/utils";
import type { Course, CourseForm, User } from "@/types";

export interface CourseWithDetails extends Course {
  instructor?: Pick<User, "id" | "full_name" | "email">;
  enrollments_count?: number;
  modules_count?: number;
}

interface UseCoursesOptions {
  instructorId?: string;
  includeArchived?: boolean;
}

export function useCourses(options: UseCoursesOptions = {}) {
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("courses")
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email),
          enrollments:enrollments(count),
          modules:modules(count)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!options.includeArchived) {
        query = query.eq("is_archived", false);
      }

      if (options.instructorId) {
        query = query.eq("instructor_id", options.instructorId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include computed fields
      const transformedCourses: CourseWithDetails[] = (data || []).map((course: any) => ({
        ...course,
        instructor: course.instructor || undefined,
        enrollments_count: course.enrollments?.[0]?.count || 0,
        modules_count: course.modules?.[0]?.count || 0,
      }));

      setCourses(transformedCourses);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch courses"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.instructorId, options.includeArchived]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = async (courseData: CourseForm): Promise<Course | null> => {
    try {
      // Get current user for tenant_id and instructor_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Generate unique enrollment code
      let enrollmentCode = generateEnrollmentCode();

      // Make sure enrollment code is unique within tenant
      let isUnique = false;
      while (!isUnique) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("tenant_id", userData.tenant_id)
          .eq("enrollment_code", enrollmentCode)
          .single();

        if (!existing) {
          isUnique = true;
        } else {
          enrollmentCode = generateEnrollmentCode();
        }
      }

      const { data, error: createError } = await supabase
        .from("courses")
        .insert([{
          tenant_id: userData.tenant_id,
          instructor_id: user.id,
          title: courseData.title,
          description: courseData.description || null,
          course_code: courseData.courseCode || null,
          course_type: courseData.courseType,
          enrollment_code: enrollmentCode,
          start_date: courseData.startDate || null,
          end_date: courseData.endDate || null,
          max_students: courseData.maxStudents || null,
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Refetch to get the full data with relations
      await fetchCourses();
      return data as Course;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create course";
      setError(new Error(message));
      throw err;
    }
  };

  const updateCourse = async (
    courseId: string,
    updates: Partial<CourseForm>
  ): Promise<Course | null> => {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.courseCode !== undefined) updateData.course_code = updates.courseCode;
      if (updates.courseType !== undefined) updateData.course_type = updates.courseType;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.maxStudents !== undefined) updateData.max_students = updates.maxStudents;

      const { data, error: updateError } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", courseId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchCourses();
      return data as Course;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update course"));
      return null;
    }
  };

  const archiveCourse = async (courseId: string): Promise<boolean> => {
    try {
      const { error: archiveError } = await supabase
        .from("courses")
        .update({ is_archived: true })
        .eq("id", courseId);

      if (archiveError) throw archiveError;

      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to archive course"));
      return false;
    }
  };

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      // Soft delete
      const { error: deleteError } = await supabase
        .from("courses")
        .update({ is_active: false })
        .eq("id", courseId);

      if (deleteError) throw deleteError;

      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete course"));
      return false;
    }
  };

  const regenerateEnrollmentCode = async (courseId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!userData) throw new Error("User not found");

      // Generate new unique code
      let newCode = generateEnrollmentCode();
      let isUnique = false;
      while (!isUnique) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("tenant_id", userData.tenant_id)
          .eq("enrollment_code", newCode)
          .neq("id", courseId)
          .single();

        if (!existing) {
          isUnique = true;
        } else {
          newCode = generateEnrollmentCode();
        }
      }

      const { error: updateError } = await supabase
        .from("courses")
        .update({ enrollment_code: newCode })
        .eq("id", courseId);

      if (updateError) throw updateError;

      await fetchCourses();
      return newCode;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to regenerate enrollment code"));
      return null;
    }
  };

  return {
    courses,
    isLoading,
    error,
    refetch: fetchCourses,
    createCourse,
    updateCourse,
    archiveCourse,
    deleteCourse,
    regenerateEnrollmentCode,
  };
}

// Hook for getting a single course with full details
export function useCourse(courseId: string | null) {
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("courses")
        .select(`
          *,
          instructor:users!courses_instructor_id_fkey(id, full_name, email),
          enrollments:enrollments(count),
          modules:modules(
            *,
            lessons:lessons(count),
            assignments:assignments(count)
          )
        `)
        .eq("id", courseId)
        .single();

      if (fetchError) throw fetchError;

      const transformedCourse = {
        ...data,
        instructor: data.instructor || undefined,
        enrollments_count: data.enrollments?.[0]?.count || 0,
        modules_count: data.modules?.length || 0,
      } as CourseWithDetails;

      setCourse(transformedCourse);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch course"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, supabase]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return { course, isLoading, error, refetch: fetchCourse };
}

// Hook for instructor's own courses
export function useInstructorCourses() {
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setInstructorId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return useCourses({ instructorId: instructorId || undefined });
}

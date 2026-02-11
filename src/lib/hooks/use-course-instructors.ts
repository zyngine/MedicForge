"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export type CourseInstructorRole = "lead" | "coordinator" | "instructor" | "assistant" | "grader";

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_id: string;
  role: CourseInstructorRole;
  can_edit: boolean;
  can_grade: boolean;
  can_manage_students: boolean;
  added_by: string | null;
  added_at: string;
  instructor?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export const INSTRUCTOR_ROLES: { value: CourseInstructorRole; label: string; description: string }[] = [
  { value: "lead", label: "Lead Instructor", description: "Primary instructor with full control" },
  { value: "coordinator", label: "Course Coordinator", description: "Manages course logistics and scheduling" },
  { value: "instructor", label: "Instructor", description: "Can teach and grade" },
  { value: "assistant", label: "Teaching Assistant", description: "Helps with instruction and grading" },
  { value: "grader", label: "Grader", description: "Can only grade submissions" },
];

/**
 * Get all instructors for a course
 */
export function useCourseInstructors(courseId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["course-instructors", courseId],
    queryFn: async () => {
      if (!courseId || !tenant?.id) return [];

      const supabase: any = createClient();
      const { data, error } = await supabase
        .from("course_instructors")
        .select(`
          *,
          instructor:users!course_instructors_instructor_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq("course_id", courseId)
        .order("role", { ascending: true });

      if (error) throw error;
      return (data || []) as CourseInstructor[];
    },
    enabled: !!courseId && !!tenant?.id,
  });
}

/**
 * Get all courses where user is an instructor
 */
export function useMyInstructorCourses() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["my-instructor-courses", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase: any = createClient();

      // Get courses from junction table
      const { data, error } = await supabase
        .from("course_instructors")
        .select(`
          course_id,
          role,
          can_edit,
          can_grade,
          can_manage_students,
          course:courses(
            *,
            instructor:users!courses_instructor_id_fkey(id, full_name, email)
          )
        `)
        .order("added_at", { ascending: false });

      if (error) throw error;

      // Filter to only include courses from current tenant and flatten
      return (data || [])
        .filter((d: any) => d.course && d.course.tenant_id === tenant.id && !d.course.is_archived)
        .map((d: any) => ({
          ...d.course,
          my_role: d.role,
          my_permissions: {
            can_edit: d.can_edit,
            can_grade: d.can_grade,
            can_manage_students: d.can_manage_students,
          },
        }));
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Add an instructor to a course
 */
export function useAddCourseInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      instructorId,
      role = "instructor",
      canEdit = true,
      canGrade = true,
      canManageStudents = false,
    }: {
      courseId: string;
      instructorId: string;
      role?: CourseInstructorRole;
      canEdit?: boolean;
      canGrade?: boolean;
      canManageStudents?: boolean;
    }) => {
      const supabase: any = createClient();

      const { data, error } = await supabase
        .from("course_instructors")
        .insert({
          course_id: courseId,
          instructor_id: instructorId,
          role,
          can_edit: canEdit,
          can_grade: canGrade,
          can_manage_students: canManageStudents,
        })
        .select(`
          *,
          instructor:users!course_instructors_instructor_id_fkey(id, full_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as CourseInstructor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-instructors", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Update an instructor's role/permissions
 */
export function useUpdateCourseInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      courseId,
      role,
      canEdit,
      canGrade,
      canManageStudents,
    }: {
      id: string;
      courseId: string;
      role?: CourseInstructorRole;
      canEdit?: boolean;
      canGrade?: boolean;
      canManageStudents?: boolean;
    }) => {
      const supabase: any = createClient();

      const updates: Record<string, any> = {};
      if (role !== undefined) updates.role = role;
      if (canEdit !== undefined) updates.can_edit = canEdit;
      if (canGrade !== undefined) updates.can_grade = canGrade;
      if (canManageStudents !== undefined) updates.can_manage_students = canManageStudents;

      const { data, error } = await supabase
        .from("course_instructors")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          instructor:users!course_instructors_instructor_id_fkey(id, full_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as CourseInstructor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-instructors", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-instructor-courses"] });
    },
  });
}

/**
 * Remove an instructor from a course
 */
export function useRemoveCourseInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const supabase: any = createClient();

      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-instructors", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Check if user is an instructor for a course
 */
export function useIsCourseinstructor(courseId: string | null | undefined) {
  const { data: instructors } = useCourseInstructors(courseId);

  return useQuery({
    queryKey: ["is-course-instructor", courseId],
    queryFn: async () => {
      if (!courseId) return false;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      return instructors?.some((i) => i.instructor_id === user.id) || false;
    },
    enabled: !!courseId && !!instructors,
  });
}

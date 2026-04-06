"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

// ==================== Students Hook (for cohort member selection) ====================
export function useStudents() {
  const { tenant } = useTenant();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ["students", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("tenant_id", tenant.id)
        .eq("role", "student")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data as { id: string; full_name: string; email: string | null }[];
    },
    enabled: !!tenant?.id,
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export interface Cohort {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  course_type: string | null;
  start_date: string | null;
  expected_graduation: string | null;
  is_active: boolean;
  max_students: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed
  member_count?: number;
  course_count?: number;
}

export interface CohortMember {
  id: string;
  cohort_id: string;
  student_id: string;
  status: "active" | "graduated" | "withdrawn" | "transferred";
  joined_at: string;
  left_at: string | null;
  notes: string | null;
  student?: {
    id: string;
    full_name: string;
    email: string | null;
  };
}

export interface CohortCourse {
  id: string;
  cohort_id: string;
  course_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  course?: {
    id: string;
    title: string;
    course_type: string | null;
  };
}

export interface CreateCohortData {
  name: string;
  description?: string;
  course_type?: string;
  start_date?: string;
  expected_graduation?: string;
  max_students?: number;
}

export interface UpdateCohortData extends Partial<CreateCohortData> {
  is_active?: boolean;
}

// ==================== Cohorts Hook ====================
// Note: Using 'any' type assertions because cohorts tables are new and not yet in generated types
 
export function useCohorts(options?: { active_only?: boolean }) {
  const { tenant } = useTenant();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cohorts", tenant?.id, options?.active_only],
    queryFn: async () => {
      if (!tenant?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("cohorts")
        .select(`
          *,
          cohort_members(count),
          cohort_courses(count)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (options?.active_only) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((cohort: any) => ({
        ...cohort,
        member_count: cohort.cohort_members?.[0]?.count || 0,
        course_count: cohort.cohort_courses?.[0]?.count || 0,
      })) as Cohort[];
    },
    enabled: !!tenant?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCohortData) => {
      if (!tenant?.id) throw new Error("No tenant");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cohort, error } = await (supabase as any)
        .from("cohorts")
        .insert({
          tenant_id: tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCohortData }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cohort, error } = await (supabase as any)
        .from("cohorts")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("cohorts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  return {
    cohorts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCohort: createMutation.mutateAsync,
    updateCohort: updateMutation.mutateAsync,
    deleteCohort: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
}

// ==================== Single Cohort Hook ====================
export function useCohort(cohortId: string | null) {
  const supabase = createClient();

  const query = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: async () => {
      if (!cohortId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohorts")
        .select("*")
        .eq("id", cohortId)
        .single();

      if (error) throw error;
      return data as Cohort;
    },
    enabled: !!cohortId,
  });

  return {
    cohort: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ==================== Cohort Members Hook ====================
export function useCohortMembers(cohortId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cohort-members", cohortId],
    queryFn: async () => {
      if (!cohortId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_members")
        .select(`
          *,
          student:users!cohort_members_student_id_fkey(id, full_name, email)
        `)
        .eq("cohort_id", cohortId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as CohortMember[];
    },
    enabled: !!cohortId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ studentId, notes }: { studentId: string; notes?: string }) => {
      if (!cohortId) throw new Error("No cohort ID");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_members")
        .insert({
          cohort_id: cohortId,
          student_id: studentId,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!cohortId) throw new Error("No cohort ID");

      const records = studentIds.map((studentId) => ({
        cohort_id: cohortId,
        student_id: studentId,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_members")
        .upsert(records, { onConflict: "cohort_id,student_id" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("cohort_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const updateMemberStatusMutation = useMutation({
    mutationFn: async ({ memberId, status, notes }: { memberId: string; status: string; notes?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = { status };
      if (notes !== undefined) updateData.notes = notes;
      if (status === "graduated" || status === "withdrawn" || status === "transferred") {
        updateData.left_at = new Date().toISOString();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_members")
        .update(updateData)
        .eq("id", memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] });
    },
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addMember: addMemberMutation.mutateAsync,
    addMembers: addMembersMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    updateMemberStatus: updateMemberStatusMutation.mutateAsync,
    isAdding: addMemberMutation.isPending || addMembersMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    refetch: query.refetch,
  };
}

// ==================== Cohort Courses Hook ====================
export function useCohortCourses(cohortId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cohort-courses", cohortId],
    queryFn: async () => {
      if (!cohortId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_courses")
        .select(`
          *,
          course:courses!cohort_courses_course_id_fkey(id, title, course_type)
        `)
        .eq("cohort_id", cohortId)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return data as CohortCourse[];
    },
    enabled: !!cohortId,
  });

  const enrollInCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!cohortId) throw new Error("No cohort ID");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cohort_courses")
        .insert({
          cohort_id: cohortId,
          course_id: courseId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-courses", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  const unenrollFromCourseMutation = useMutation({
    mutationFn: async (cohortCourseId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("cohort_courses")
        .delete()
        .eq("id", cohortCourseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-courses", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });

  return {
    courses: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    enrollInCourse: enrollInCourseMutation.mutateAsync,
    unenrollFromCourse: unenrollFromCourseMutation.mutateAsync,
    isEnrolling: enrollInCourseMutation.isPending,
    refetch: query.refetch,
  };
}

// ==================== Batch Enroll Hook ====================
export function useBatchEnrollCohort() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ cohortId, courseId }: { cohortId: string; courseId: string }) => {
      // Get all active members of the cohort
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: members, error: membersError } = await (supabase as any)
        .from("cohort_members")
        .select("student_id")
        .eq("cohort_id", cohortId)
        .eq("status", "active");

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        throw new Error("No active members in cohort");
      }

      // Enroll each member in the course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrollments = members.map((m: any) => ({
        course_id: courseId,
        student_id: m.student_id,
        status: "active",
      }));

      const { data, error } = await supabase
        .from("enrollments")
        .upsert(enrollments, { onConflict: "course_id,student_id" })
        .select();

      if (error) throw error;

      // Also add the course to cohort_courses if not already there
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("cohort_courses")
        .upsert({ cohort_id: cohortId, course_id: courseId }, { onConflict: "cohort_id,course_id" });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["cohort-courses"] });
    },
  });

  return {
    batchEnroll: mutation.mutateAsync,
    isEnrolling: mutation.isPending,
    error: mutation.error,
  };
}

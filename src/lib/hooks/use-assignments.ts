"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import type { Database } from "@/types/database.types";

type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type Module = Database["public"]["Tables"]["modules"]["Row"];
type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];

export interface AssignmentWithDetails extends Assignment {
  module?: Module;
  quiz_questions?: QuizQuestion[];
  questions_count?: number;
  question_count?: number; // Alias for backward compatibility
  submissions_count?: number;
  submission_count?: number; // Alias for backward compatibility
}

type AssignmentType = "quiz" | "written" | "skill_checklist" | "discussion";

interface AssignmentForm {
  title: string;
  description?: string;
  instructions?: string;
  type?: AssignmentType;
  due_date?: string;
  available_from?: string;
  points_possible?: number;
  time_limit_minutes?: number;
  attempts_allowed?: number;
  settings?: any;
  rubric?: any;
  is_published?: boolean;
}

interface UseAssignmentsOptions {
  moduleId?: string;
  courseId?: string;
  includeUnpublished?: boolean;
}

/**
 * Get assignments with optional filters
 */
export function useAssignments(options: UseAssignmentsOptions = {}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["assignments", tenant?.id, options],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("assignments")
        .select(`
          *,
          module:modules(*),
          quiz_questions:quiz_questions(count),
          submissions:submissions(count)
        `)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (options.moduleId) {
        query = query.eq("module_id", options.moduleId);
      }

      if (options.courseId) {
        // Filter by course through modules
        query = query.eq("module.course_id", options.courseId);
      }

      if (!options.includeUnpublished) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include computed fields with backward compatibility
      return (data || []).map((assignment: any) => {
        const questionsCount = assignment.quiz_questions?.[0]?.count || 0;
        const submissionsCount = assignment.submissions?.[0]?.count || 0;
        return {
          ...assignment,
          module: assignment.module ? {
            ...assignment.module,
            order_index: assignment.module.order_index ?? 0,
            is_published: assignment.module.is_published ?? false,
          } : undefined,
          questions_count: questionsCount,
          question_count: questionsCount,
          submissions_count: submissionsCount,
          submission_count: submissionsCount,
        };
      }) as AssignmentWithDetails[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single assignment with its questions
 */
export function useAssignment(assignmentId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          module:modules(*),
          quiz_questions:quiz_questions(*)
        `)
        .eq("id", assignmentId)
        .single();

      if (error) throw error;

      const transformedQuestions = (data.quiz_questions || [])
        .map((q: any) => ({
          ...q,
          question_type: q.question_type ?? "multiple_choice",
          points: q.points ?? 1,
          order_index: q.order_index ?? 0,
        }))
        .sort((a: any, b: any) => a.order_index - b.order_index);

      const questionsCount = transformedQuestions.length;

      return {
        ...data,
        type: data.type ?? "quiz",
        module: data.module ? {
          ...data.module,
          order_index: data.module.order_index ?? 0,
          is_published: data.module.is_published ?? false,
        } : undefined,
        quiz_questions: transformedQuestions,
        questions_count: questionsCount,
        question_count: questionsCount,
      } as AssignmentWithDetails;
    },
    enabled: !!assignmentId && !!tenant?.id,
  });
}

/**
 * Create a new assignment
 */
export function useCreateAssignment() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: AssignmentForm;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      const { data: assignment, error } = await supabase
        .from("assignments")
        .insert({
          tenant_id: tenant.id,
          module_id: moduleId,
          title: data.title,
          description: data.description || null,
          instructions: data.instructions || null,
          type: data.type || "quiz",
          due_date: data.due_date || null,
          available_from: data.available_from || null,
          points_possible: data.points_possible || 100,
          time_limit_minutes: data.time_limit_minutes || null,
          attempts_allowed: data.attempts_allowed || 1,
          settings: data.settings || null,
          rubric: data.rubric || null,
          is_published: data.is_published ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Update an assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: Partial<AssignmentForm>;
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.due_date !== undefined) updateData.due_date = data.due_date;
      if (data.available_from !== undefined) updateData.available_from = data.available_from;
      if (data.points_possible !== undefined) updateData.points_possible = data.points_possible;
      if (data.time_limit_minutes !== undefined) updateData.time_limit_minutes = data.time_limit_minutes;
      if (data.attempts_allowed !== undefined) updateData.attempts_allowed = data.attempts_allowed;
      if (data.settings !== undefined) updateData.settings = data.settings;
      if (data.rubric !== undefined) updateData.rubric = data.rubric;
      if (data.is_published !== undefined) updateData.is_published = data.is_published;

      const { data: assignment, error } = await supabase
        .from("assignments")
        .update(updateData)
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignment", assignment.id] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Delete an assignment
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      return { assignmentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Publish an assignment
 */
export function usePublishAssignment() {
  const { mutateAsync: updateAssignment } = useUpdateAssignment();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return updateAssignment({
        assignmentId,
        data: { is_published: true },
      });
    },
  });
}

/**
 * Unpublish an assignment
 */
export function useUnpublishAssignment() {
  const { mutateAsync: updateAssignment } = useUpdateAssignment();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return updateAssignment({
        assignmentId,
        data: { is_published: false },
      });
    },
  });
}

/**
 * Get assignments for a specific module (instructor view)
 */
export function useModuleAssignments(moduleId: string | null | undefined) {
  return useAssignments({
    moduleId: moduleId || undefined,
    includeUnpublished: true
  });
}

/**
 * Get assignments for a specific course
 */
export function useCourseAssignments(courseId: string | null | undefined) {
  return useAssignments({
    courseId: courseId || undefined,
    includeUnpublished: false,
  });
}

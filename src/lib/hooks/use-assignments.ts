"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Assignment, QuizQuestion, Module } from "@/types";

export interface AssignmentWithDetails extends Assignment {
  module?: Module;
  quiz_questions?: QuizQuestion[];
  questions_count?: number;
  submissions_count?: number;
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

export function useAssignments(options: UseAssignmentsOptions = {}) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("assignments")
        .select(`
          *,
          module:modules(*),
          quiz_questions:quiz_questions(count),
          submissions:submissions(count)
        `)
        .order("due_date", { ascending: true });

      if (options.moduleId) {
        query = query.eq("module_id", options.moduleId);
      }

      if (options.courseId) {
        // Need to join through modules to filter by course
        query = query.eq("module.course_id", options.courseId);
      }

      if (!options.includeUnpublished) {
        query = query.eq("is_published", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include computed fields
      const transformedAssignments: AssignmentWithDetails[] = (data || []).map((assignment: any) => ({
        ...assignment,
        module: assignment.module ? {
          ...assignment.module,
          order_index: assignment.module.order_index ?? 0,
          is_published: assignment.module.is_published ?? false,
        } as Module : undefined,
        questions_count: assignment.quiz_questions?.[0]?.count || 0,
        submissions_count: assignment.submissions?.[0]?.count || 0,
      }));

      setAssignments(transformedAssignments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch assignments"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.moduleId, options.courseId, options.includeUnpublished]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = async (
    moduleId: string,
    assignmentData: AssignmentForm
  ): Promise<Assignment | null> => {
    try {
      // Get current user for tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("assignments")
        .insert([{
          tenant_id: userData.tenant_id,
          module_id: moduleId,
          title: assignmentData.title,
          description: assignmentData.description || null,
          instructions: assignmentData.instructions || null,
          type: assignmentData.type || "quiz",
          due_date: assignmentData.due_date || null,
          available_from: assignmentData.available_from || null,
          points_possible: assignmentData.points_possible || 100,
          time_limit_minutes: assignmentData.time_limit_minutes || null,
          attempts_allowed: assignmentData.attempts_allowed || 1,
          settings: assignmentData.settings || null,
          rubric: assignmentData.rubric || null,
          is_published: assignmentData.is_published ?? false,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchAssignments();
      return data as Assignment;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assignment";
      setError(new Error(message));
      throw err;
    }
  };

  const updateAssignment = async (
    assignmentId: string,
    updates: Partial<AssignmentForm>
  ): Promise<Assignment | null> => {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      if (updates.available_from !== undefined) updateData.available_from = updates.available_from;
      if (updates.points_possible !== undefined) updateData.points_possible = updates.points_possible;
      if (updates.time_limit_minutes !== undefined) updateData.time_limit_minutes = updates.time_limit_minutes;
      if (updates.attempts_allowed !== undefined) updateData.attempts_allowed = updates.attempts_allowed;
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.rubric !== undefined) updateData.rubric = updates.rubric;
      if (updates.is_published !== undefined) updateData.is_published = updates.is_published;

      const { data, error: updateError } = await supabase
        .from("assignments")
        .update(updateData)
        .eq("id", assignmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchAssignments();
      return data as Assignment;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update assignment"));
      return null;
    }
  };

  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (deleteError) throw deleteError;

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete assignment"));
      return false;
    }
  };

  const publishAssignment = async (assignmentId: string): Promise<boolean> => {
    return (await updateAssignment(assignmentId, { is_published: true })) !== null;
  };

  const unpublishAssignment = async (assignmentId: string): Promise<boolean> => {
    return (await updateAssignment(assignmentId, { is_published: false })) !== null;
  };

  return {
    assignments,
    isLoading,
    error,
    refetch: fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    publishAssignment,
    unpublishAssignment,
  };
}

// Hook for getting a single assignment with its questions
export function useAssignment(assignmentId: string | null) {
  const [assignment, setAssignment] = useState<AssignmentWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchAssignment = useCallback(async () => {
    if (!assignmentId) {
      setAssignment(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("assignments")
        .select(`
          *,
          module:modules(*),
          quiz_questions:quiz_questions(*)
        `)
        .eq("id", assignmentId)
        .single();

      if (fetchError) throw fetchError;

      const transformedQuestions = (data.quiz_questions || []).map((q: any) => ({
          ...q,
          question_type: q.question_type ?? "multiple_choice",
          points: q.points ?? 1,
          order_index: q.order_index ?? 0,
        })) as QuizQuestion[];

      const transformedAssignment = {
        ...data,
        type: data.type ?? "quiz",
        module: data.module ? {
          ...data.module,
          order_index: data.module.order_index ?? 0,
          is_published: data.module.is_published ?? false,
        } as Module : undefined,
        quiz_questions: transformedQuestions,
        questions_count: transformedQuestions.length,
      } as AssignmentWithDetails;

      setAssignment(transformedAssignment);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch assignment"));
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, supabase]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  return { assignment, isLoading, error, refetch: fetchAssignment };
}

// Hook for getting assignments for a specific module (instructor view)
export function useModuleAssignments(moduleId: string | null) {
  return useAssignments({ moduleId: moduleId || undefined, includeUnpublished: true });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Re-use the QuizQuestion type from quiz-builder for consistency
export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "matching";
  options: string[];
  correct_answer: number | string | number[];
  points: number;
  explanation?: string;
  order_index?: number;
}

export interface QuizTemplate {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  description: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  passing_score: number;
  questions: QuizQuestion[];
  total_points: number;
  question_count: number;
  tags: string[];
  certification_level: string | null;
  is_active: boolean;
  times_used: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Get all quiz templates for the current tenant
 */
export function useQuizTemplates(options?: {
  tags?: string[];
  certificationLevel?: string;
  search?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["quiz-templates", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase: any = createClient();
      let query = supabase
        .from("quiz_templates")
        .select(`
          *,
          creator:users!quiz_templates_created_by_fkey(id, full_name, email)
        `)
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (options?.certificationLevel) {
        query = query.eq("certification_level", options.certificationLevel);
      }

      if (options?.tags && options.tags.length > 0) {
        query = query.contains("tags", options.tags);
      }

      const { data, error } = await query;

      if (error) throw error;

      let templates = (data || []) as QuizTemplate[];

      // Client-side search filtering
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        templates = templates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        );
      }

      return templates;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single quiz template by ID
 */
export function useQuizTemplate(templateId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["quiz-template", templateId],
    queryFn: async () => {
      if (!templateId || !tenant?.id) return null;

      const supabase: any = createClient();
      const { data, error } = await supabase
        .from("quiz_templates")
        .select(`
          *,
          creator:users!quiz_templates_created_by_fkey(id, full_name, email)
        `)
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as QuizTemplate;
    },
    enabled: !!templateId && !!tenant?.id,
  });
}

/**
 * Create a new quiz template
 */
export function useCreateQuizTemplate() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      time_limit_minutes?: number;
      max_attempts?: number;
      shuffle_questions?: boolean;
      shuffle_options?: boolean;
      show_correct_answers?: boolean;
      passing_score?: number;
      questions: QuizQuestion[];
      tags?: string[];
      certification_level?: string;
    }) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase: any = createClient();
      const { data, error } = await supabase
        .from("quiz_templates")
        .insert({
          tenant_id: tenant.id,
          created_by: user.id,
          name: input.name,
          description: input.description || null,
          time_limit_minutes: input.time_limit_minutes || null,
          max_attempts: input.max_attempts || 1,
          shuffle_questions: input.shuffle_questions || false,
          shuffle_options: input.shuffle_options || false,
          show_correct_answers: input.show_correct_answers ?? true,
          passing_score: input.passing_score || 70,
          questions: JSON.stringify(input.questions),
          tags: input.tags || [],
          certification_level: input.certification_level || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuizTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-templates"] });
    },
  });
}

/**
 * Update a quiz template
 */
export function useUpdateQuizTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<QuizTemplate> & { id: string }) => {
      const supabase: any = createClient();

      // Convert questions to JSON string if present
      const dbUpdates: any = { ...updates };
      if (updates.questions) {
        dbUpdates.questions = JSON.stringify(updates.questions);
      }

      const { data, error } = await supabase
        .from("quiz_templates")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as QuizTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-templates"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-template", data.id] });
    },
  });
}

/**
 * Delete (soft) a quiz template
 */
export function useDeleteQuizTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const supabase: any = createClient();

      const { error } = await supabase
        .from("quiz_templates")
        .update({ is_active: false })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-templates"] });
    },
  });
}

/**
 * Clone a quiz template into an assignment
 * Returns the questions and settings to use when creating the assignment
 */
export function useCloneQuizTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const supabase: any = createClient();

      // Get the template
      const { data: template, error } = await supabase
        .from("quiz_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      // Increment usage counter
      await supabase.rpc("increment_quiz_template_usage", {
        template_id: templateId,
      });

      // Return the template data for the caller to use
      return {
        name: template.name,
        description: template.description,
        time_limit_minutes: template.time_limit_minutes,
        max_attempts: template.max_attempts,
        shuffle_questions: template.shuffle_questions,
        shuffle_options: template.shuffle_options,
        show_correct_answers: template.show_correct_answers,
        passing_score: template.passing_score,
        questions: template.questions as QuizQuestion[],
        total_points: template.total_points,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-templates"] });
    },
  });
}

/**
 * Save an existing assignment's quiz as a template
 */
export function useSaveAsQuizTemplate() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      name,
      description,
      tags,
      certification_level,
    }: {
      assignmentId: string;
      name: string;
      description?: string;
      tags?: string[];
      certification_level?: string;
    }) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase: any = createClient();

      // Get assignment and its questions
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Get quiz questions
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      // Transform questions to template format
      const templateQuestions: QuizQuestion[] = (questions || []).map(
        (q: any, index: number) => ({
          id: `q_${index}`,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points,
          explanation: q.explanation,
          order_index: index,
        })
      );

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("quiz_templates")
        .insert({
          tenant_id: tenant.id,
          created_by: user.id,
          name,
          description: description || assignment.description,
          time_limit_minutes: assignment.time_limit_minutes,
          max_attempts: assignment.max_attempts,
          shuffle_questions: assignment.shuffle_questions || false,
          shuffle_options: assignment.shuffle_options || false,
          show_correct_answers: assignment.show_correct_answers ?? true,
          passing_score: assignment.passing_score || 70,
          questions: JSON.stringify(templateQuestions),
          tags: tags || [],
          certification_level: certification_level || null,
        })
        .select()
        .single();

      if (templateError) throw templateError;
      return template as QuizTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-templates"] });
    },
  });
}

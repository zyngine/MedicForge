"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import type { Database } from "@/types/database.types";

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];

type QuestionType = "multiple_choice" | "true_false" | "matching" | "short_answer";

interface QuizQuestionForm {
  question_text: string;
  question_type?: QuestionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correct_answer: any;
  points?: number;
  order_index?: number;
  explanation?: string;
}

/**
 * Get quiz questions for an assignment
 */
export function useQuizQuestions(assignmentId: string | null | undefined) {
  const { tenant } = useTenant();

  const query = useQuery({
    queryKey: ["quiz-questions", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      // Transform data to ensure required fields have defaults
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((q: any) => ({
        ...q,
        question_type: q.question_type ?? "multiple_choice",
        points: q.points ?? 1,
        order_index: q.order_index ?? 0,
      })) as QuizQuestion[];
    },
    enabled: !!assignmentId && !!tenant?.id,
  });

  // Calculate total points
  const totalPoints = (query.data || []).reduce((sum, q) => sum + (q.points || 1), 0);

  return {
    ...query,
    totalPoints,
  };
}

/**
 * Create a quiz question
 */
export function useCreateQuizQuestion() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: QuizQuestionForm;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Get next order index if not provided
      let orderIndex = data.order_index;
      if (orderIndex === undefined) {
        const { data: existingQuestions } = await supabase
          .from("quiz_questions")
          .select("order_index")
          .eq("assignment_id", assignmentId)
          .order("order_index", { ascending: false })
          .limit(1);

        orderIndex = existingQuestions && existingQuestions.length > 0 && existingQuestions[0].order_index !== null
          ? existingQuestions[0].order_index + 1
          : 0;
      }

      const { data: question, error } = await supabase
        .from("quiz_questions")
        .insert({
          tenant_id: tenant.id,
          assignment_id: assignmentId,
          question_text: data.question_text,
          question_type: data.question_type || "multiple_choice",
          options: data.options || null,
          correct_answer: data.correct_answer,
          points: data.points || 1,
          order_index: orderIndex,
          explanation: data.explanation || null,
        })
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

/**
 * Update a quiz question
 */
export function useUpdateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      data,
    }: {
      questionId: string;
      data: Partial<QuizQuestionForm>;
    }) => {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      if (data.question_text !== undefined) updateData.question_text = data.question_text;
      if (data.question_type !== undefined) updateData.question_type = data.question_type;
      if (data.options !== undefined) updateData.options = data.options;
      if (data.correct_answer !== undefined) updateData.correct_answer = data.correct_answer;
      if (data.points !== undefined) updateData.points = data.points;
      if (data.order_index !== undefined) updateData.order_index = data.order_index;
      if (data.explanation !== undefined) updateData.explanation = data.explanation;

      const { data: question, error } = await supabase
        .from("quiz_questions")
        .update(updateData as never)
        .eq("id", questionId)
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (question) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", question.assignment_id] });
      queryClient.invalidateQueries({ queryKey: ["assignment", question.assignment_id] });
    },
  });
}

/**
 * Delete a quiz question
 */
export function useDeleteQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      const supabase = createClient();

      // Get the assignment_id before deleting
      const { data: question } = await supabase
        .from("quiz_questions")
        .select("assignment_id")
        .eq("id", questionId)
        .single();

      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;
      return { questionId, assignmentId: question?.assignment_id };
    },
    onSuccess: (result) => {
      if (result.assignmentId) {
        queryClient.invalidateQueries({ queryKey: ["quiz-questions", result.assignmentId] });
        queryClient.invalidateQueries({ queryKey: ["assignment", result.assignmentId] });
      }
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

/**
 * Reorder quiz questions
 */
export function useReorderQuizQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      orderedIds,
    }: {
      assignmentId: string;
      orderedIds: string[];
    }) => {
      const supabase = createClient();

      // Update order_index for each question
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("quiz_questions")
          .update({ order_index: i })
          .eq("id", orderedIds[i]);

        if (error) throw error;
      }

      return { assignmentId, orderedIds };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", result.assignmentId] });
    },
  });
}

/**
 * Bulk create quiz questions
 */
export function useBulkCreateQuizQuestions() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      questions,
    }: {
      assignmentId: string;
      questions: QuizQuestionForm[];
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Get current max order index
      const { data: existingQuestions } = await supabase
        .from("quiz_questions")
        .select("order_index")
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: false })
        .limit(1);

      const startIndex = existingQuestions && existingQuestions.length > 0 && existingQuestions[0].order_index !== null
        ? existingQuestions[0].order_index + 1
        : 0;

      const questionsToInsert = questions.map((q, index) => ({
        tenant_id: tenant.id,
        assignment_id: assignmentId,
        question_text: q.question_text,
        question_type: q.question_type || "multiple_choice",
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: q.order_index ?? startIndex + index,
        explanation: q.explanation || null,
      }));

      const { data, error } = await supabase
        .from("quiz_questions")
        .insert(questionsToInsert)
        .select();

      if (error) throw error;
      return data as QuizQuestion[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

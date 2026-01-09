"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QuizQuestion } from "@/types";

type QuestionType = "multiple_choice" | "true_false" | "matching" | "short_answer";

interface QuizQuestionForm {
  question_text: string;
  question_type?: QuestionType;
  options?: any;
  correct_answer: any;
  points?: number;
  order_index?: number;
  explanation?: string;
}

export function useQuizQuestions(assignmentId: string | null) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchQuestions = useCallback(async () => {
    if (!assignmentId) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;

      // Transform data to ensure required fields have defaults
      const transformedQuestions: QuizQuestion[] = (data || []).map((q: any) => ({
        ...q,
        question_type: q.question_type ?? "multiple_choice",
        points: q.points ?? 1,
        order_index: q.order_index ?? 0,
      }));

      setQuestions(transformedQuestions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch questions"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, assignmentId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const createQuestion = async (questionData: QuizQuestionForm): Promise<QuizQuestion | null> => {
    if (!assignmentId) return null;

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

      // Get next order index
      const maxOrderIndex = questions.length > 0
        ? Math.max(...questions.map(q => q.order_index))
        : -1;

      const { data, error: createError } = await supabase
        .from("quiz_questions")
        .insert([{
          tenant_id: userData.tenant_id,
          assignment_id: assignmentId,
          question_text: questionData.question_text,
          question_type: questionData.question_type || "multiple_choice",
          options: questionData.options || null,
          correct_answer: questionData.correct_answer,
          points: questionData.points || 1,
          order_index: questionData.order_index ?? maxOrderIndex + 1,
          explanation: questionData.explanation || null,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchQuestions();
      return data as QuizQuestion;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create question";
      setError(new Error(message));
      throw err;
    }
  };

  const updateQuestion = async (
    questionId: string,
    updates: Partial<QuizQuestionForm>
  ): Promise<QuizQuestion | null> => {
    try {
      const updateData: any = {};

      if (updates.question_text !== undefined) updateData.question_text = updates.question_text;
      if (updates.question_type !== undefined) updateData.question_type = updates.question_type;
      if (updates.options !== undefined) updateData.options = updates.options;
      if (updates.correct_answer !== undefined) updateData.correct_answer = updates.correct_answer;
      if (updates.points !== undefined) updateData.points = updates.points;
      if (updates.order_index !== undefined) updateData.order_index = updates.order_index;
      if (updates.explanation !== undefined) updateData.explanation = updates.explanation;

      const { data, error: updateError } = await supabase
        .from("quiz_questions")
        .update(updateData)
        .eq("id", questionId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchQuestions();
      return data as QuizQuestion;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update question"));
      return null;
    }
  };

  const deleteQuestion = async (questionId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (deleteError) throw deleteError;

      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete question"));
      return false;
    }
  };

  const reorderQuestions = async (orderedIds: string[]): Promise<boolean> => {
    try {
      // Update order_index for each question
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("quiz_questions")
          .update({ order_index: update.order_index })
          .eq("id", update.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setQuestions((prev) => {
        const questionMap = new Map(prev.map((q) => [q.id, q]));
        return orderedIds
          .map((id, index) => {
            const question = questionMap.get(id);
            return question ? { ...question, order_index: index } : null;
          })
          .filter((q): q is QuizQuestion => q !== null);
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reorder questions"));
      return false;
    }
  };

  // Bulk create questions (useful for importing)
  const bulkCreateQuestions = async (questionsData: QuizQuestionForm[]): Promise<QuizQuestion[]> => {
    if (!assignmentId) return [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const questionsToInsert = questionsData.map((q, index) => ({
        tenant_id: userData.tenant_id,
        assignment_id: assignmentId,
        question_text: q.question_text,
        question_type: q.question_type || "multiple_choice",
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: q.order_index ?? questions.length + index,
        explanation: q.explanation || null,
      }));

      const { data, error: createError } = await supabase
        .from("quiz_questions")
        .insert(questionsToInsert)
        .select();

      if (createError) throw createError;

      await fetchQuestions();
      return (data || []) as QuizQuestion[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create questions";
      setError(new Error(message));
      throw err;
    }
  };

  // Calculate total points for the quiz
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return {
    questions,
    isLoading,
    error,
    totalPoints,
    refetch: fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    bulkCreateQuestions,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

// Note: These tables are created by migration 20240310000000_question_bank.sql
// Using 'as any' until types are regenerated from Supabase

export type QuestionDifficulty = "easy" | "medium" | "hard" | "expert";
export type CertificationLevel = "EMR" | "EMT" | "AEMT" | "Paramedic" | "All";
export type QuestionType = "multiple_choice" | "true_false" | "matching" | "short_answer";

export interface QuestionBankCategory {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  certification_level: CertificationLevel;
  parent_category_id: string | null;
  nremt_category_code: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionBankItem {
  id: string;
  tenant_id: string | null;
  category_id: string | null;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  correct_answer: unknown;
  explanation: string | null;
  certification_level: CertificationLevel;
  difficulty: QuestionDifficulty;
  points: number;
  time_estimate_seconds: number;
  source: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_validated: boolean;
  is_active: boolean;
  times_used: number;
  times_correct: number;
  avg_time_seconds: number | null;
  discrimination_index: number | null;
  references: { title: string; url?: string; page?: string }[] | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: QuestionBankCategory;
}

export interface QuestionBankFilters {
  categoryId?: string;
  certificationLevel?: CertificationLevel;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  isValidated?: boolean;
  tags?: string[];
  search?: string;
}

export interface CreateQuestionInput {
  category_id?: string;
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer: unknown;
  explanation?: string;
  certification_level?: CertificationLevel;
  difficulty?: QuestionDifficulty;
  points?: number;
  time_estimate_seconds?: number;
  source?: string;
  references?: { title: string; url?: string; page?: string }[];
  tags?: string[];
}

export function useQuestionBankCategories() {
  const [categories, setCategories] = useState<QuestionBankCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("question_bank_categories")
        .select("*")
        .eq("is_active", true)
        .order("order_index");

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch categories"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (input: Partial<QuestionBankCategory>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("question_bank_categories")
        .insert({
          ...input,
          tenant_id: profile?.tenant_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setCategories((prev) => [...prev, data]);
      toast.success("Category created");
      return data;
    } catch (err) {
      toast.error("Failed to create category");
      throw err;
    }
  };

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
    createCategory,
  };
}

export function useQuestionBank(filters?: QuestionBankFilters) {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("question_bank")
        .select("*, category:question_bank_categories(*)", { count: "exact" })
        .eq("is_active", true);

      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters?.certificationLevel) {
        query = query.eq("certification_level", filters.certificationLevel);
      }
      if (filters?.difficulty) {
        query = query.eq("difficulty", filters.difficulty);
      }
      if (filters?.questionType) {
        query = query.eq("question_type", filters.questionType);
      }
      if (filters?.isValidated !== undefined) {
        query = query.eq("is_validated", filters.isValidated);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }
      if (filters?.search) {
        query = query.ilike("question_text", `%${filters.search}%`);
      }

      const { data, error: fetchError, count } = await query.order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setQuestions(data || []);
      setTotal(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch questions"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const createQuestion = async (input: CreateQuestionInput): Promise<QuestionBankItem | null> => {
    try {
      const { data, error: insertError } = await (supabase as any)
        .from("question_bank")
        .insert({
          ...input,
          tenant_id: profile?.tenant_id,
          created_by: profile?.id,
        })
        .select("*, category:question_bank_categories(*)")
        .single();

      if (insertError) throw insertError;
      setQuestions((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
      toast.success("Question created");
      return data;
    } catch (err) {
      toast.error("Failed to create question");
      return null;
    }
  };

  const updateQuestion = async (id: string, input: Partial<CreateQuestionInput>): Promise<QuestionBankItem | null> => {
    try {
      const { data, error: updateError } = await (supabase as any)
        .from("question_bank")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, category:question_bank_categories(*)")
        .single();

      if (updateError) throw updateError;
      setQuestions((prev) => prev.map((q) => (q.id === id ? data : q)));
      toast.success("Question updated");
      return data;
    } catch (err) {
      toast.error("Failed to update question");
      return null;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await (supabase as any)
        .from("question_bank")
        .update({ is_active: false })
        .eq("id", id);

      if (deleteError) throw deleteError;
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setTotal((prev) => prev - 1);
      toast.success("Question deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete question");
      return false;
    }
  };

  const validateQuestion = async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await (supabase as any)
        .from("question_bank")
        .update({
          is_validated: true,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, is_validated: true, reviewed_by: profile?.id || null, reviewed_at: new Date().toISOString() }
            : q
        )
      );
      toast.success("Question validated");
      return true;
    } catch (err) {
      toast.error("Failed to validate question");
      return false;
    }
  };

  const importQuestions = async (questions: CreateQuestionInput[]): Promise<number> => {
    try {
      const questionsWithMeta = questions.map((q) => ({
        ...q,
        tenant_id: profile?.tenant_id,
        created_by: profile?.id,
      }));

      const { data, error: insertError } = await (supabase as any)
        .from("question_bank")
        .insert(questionsWithMeta)
        .select();

      if (insertError) throw insertError;
      toast.success(`${data?.length || 0} questions imported`);
      fetchQuestions();
      return data?.length || 0;
    } catch (err) {
      toast.error("Failed to import questions");
      return 0;
    }
  };

  return {
    questions,
    total,
    isLoading,
    error,
    refetch: fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    validateQuestion,
    importQuestions,
  };
}

export function useQuestionStats(questionId?: string) {
  const [stats, setStats] = useState<{
    totalAttempts: number;
    correctRate: number;
    avgTime: number;
    difficultyRating: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!questionId) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("question_bank")
          .select("times_used, times_correct, avg_time_seconds, difficulty")
          .eq("id", questionId)
          .single();

        if (error) throw error;

        const correctRate = data.times_used > 0 ? (data.times_correct / data.times_used) * 100 : 0;

        setStats({
          totalAttempts: data.times_used,
          correctRate,
          avgTime: data.avg_time_seconds || 0,
          difficultyRating: data.difficulty,
        });
      } catch (err) {
        console.error("Failed to fetch question stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [questionId, supabase]);

  return { stats, isLoading };
}

// Hook for adding questions from bank to an assignment
export function useAssignmentQuestions(assignmentId: string) {
  const [assignedQuestions, setAssignedQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchAssignedQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("assignment_questions")
        .select("*, question:question_bank(*, category:question_bank_categories(*))")
        .eq("assignment_id", assignmentId)
        .order("order_index");

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAssignedQuestions(data?.map((aq: any) => aq.question) || []);
    } catch (err) {
      console.error("Failed to fetch assigned questions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, supabase]);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignedQuestions();
    }
  }, [assignmentId, fetchAssignedQuestions]);

  const addQuestion = async (questionId: string, orderIndex?: number): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from("assignment_questions").insert({
        assignment_id: assignmentId,
        question_id: questionId,
        order_index: orderIndex ?? assignedQuestions.length,
      });

      if (error) throw error;
      await fetchAssignedQuestions();
      toast.success("Question added to assignment");
      return true;
    } catch (err) {
      toast.error("Failed to add question");
      return false;
    }
  };

  const removeQuestion = async (questionId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from("assignment_questions")
        .delete()
        .eq("assignment_id", assignmentId)
        .eq("question_id", questionId);

      if (error) throw error;
      setAssignedQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success("Question removed from assignment");
      return true;
    } catch (err) {
      toast.error("Failed to remove question");
      return false;
    }
  };

  const reorderQuestions = async (questionIds: string[]): Promise<boolean> => {
    try {
      const updates = questionIds.map((id, index) => ({
        assignment_id: assignmentId,
        question_id: id,
        order_index: index,
      }));

      // Delete existing and re-insert with new order
      await (supabase as any).from("assignment_questions").delete().eq("assignment_id", assignmentId);

      const { error } = await (supabase as any).from("assignment_questions").insert(updates);

      if (error) throw error;
      await fetchAssignedQuestions();
      return true;
    } catch (err) {
      toast.error("Failed to reorder questions");
      return false;
    }
  };

  return {
    assignedQuestions,
    isLoading,
    refetch: fetchAssignedQuestions,
    addQuestion,
    removeQuestion,
    reorderQuestions,
  };
}

/**
 * Convert a question bank item to quiz builder format
 */
export function convertToQuizQuestion(question: QuestionBankItem) {
  const options = question.options?.map((opt) => opt.text) || [];
  const correctIndex = question.options?.findIndex((opt) => opt.isCorrect) ?? 0;

  let correctAnswer: number | string = correctIndex;
  if (question.question_type === "short_answer") {
    const answer = question.correct_answer as { text?: string; id?: string };
    correctAnswer = answer?.text || "";
  } else if (question.question_type === "true_false") {
    // For true/false, check if correct answer is "True" (index 0) or "False" (index 1)
    const answer = question.correct_answer as { id?: string; text?: string };
    correctAnswer = answer?.id === "A" || answer?.text?.toLowerCase() === "true" ? 0 : 1;
  }

  return {
    id: `bank_${question.id}_${Date.now()}`,
    question_text: question.question_text,
    question_type: question.question_type === "true_false" ? "true_false" as const :
                   question.question_type === "short_answer" ? "short_answer" as const :
                   "multiple_choice" as const,
    options: question.question_type === "true_false" ? ["True", "False"] : options,
    correct_answer: correctAnswer,
    points: question.points || 1,
    explanation: question.explanation || "",
    source_question_id: question.id,
  };
}

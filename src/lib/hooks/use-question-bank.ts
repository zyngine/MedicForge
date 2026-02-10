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

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
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
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (input: Partial<QuestionBankCategory>) => {
    try {
      const supabase = createClient();
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

  // Serialize filters to stable string for dependency
  const filterKey = JSON.stringify(filters || {});

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const createQuestion = async (input: CreateQuestionInput): Promise<QuestionBankItem | null> => {
    try {
      const supabase = createClient();
      // Only include valid columns for the question_bank table
      const insertData: Record<string, unknown> = {
        question_text: input.question_text,
        question_type: input.question_type,
        options: input.options || null,
        correct_answer: input.correct_answer,
        explanation: input.explanation || null,
        certification_level: input.certification_level || "EMT",
        difficulty: input.difficulty || "medium",
        points: input.points || 1,
        time_estimate_seconds: input.time_estimate_seconds || 60,
        source: input.source || null,
        tags: input.tags || null,
        references: input.references || null,
        category_id: input.category_id || null,
        tenant_id: profile?.tenant_id,
        created_by: profile?.id,
      };

      const { data, error: insertError } = await (supabase as any)
        .from("question_bank")
        .insert(insertData)
        .select("*, category:question_bank_categories(*)")
        .single();

      if (insertError) throw insertError;
      setQuestions((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
      toast.success("Question created");
      return data;
    } catch (err) {
      console.error("Create question error:", err);
      toast.error("Failed to create question");
      return null;
    }
  };

  const updateQuestion = async (id: string, input: Partial<CreateQuestionInput>): Promise<QuestionBankItem | null> => {
    try {
      const supabase = createClient();
      // Only include valid columns for the question_bank table
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Only add fields that are valid database columns
      if (input.question_text !== undefined) updateData.question_text = input.question_text;
      if (input.question_type !== undefined) updateData.question_type = input.question_type;
      if (input.options !== undefined) updateData.options = input.options;
      if (input.correct_answer !== undefined) updateData.correct_answer = input.correct_answer;
      if (input.explanation !== undefined) updateData.explanation = input.explanation || null;
      if (input.certification_level !== undefined) updateData.certification_level = input.certification_level;
      if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
      if (input.points !== undefined) updateData.points = input.points;
      if (input.time_estimate_seconds !== undefined) updateData.time_estimate_seconds = input.time_estimate_seconds;
      if (input.source !== undefined) updateData.source = input.source || null;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.category_id !== undefined) updateData.category_id = input.category_id || null;
      if (input.references !== undefined) updateData.references = input.references;

      const { data, error: updateError } = await (supabase as any)
        .from("question_bank")
        .update(updateData)
        .eq("id", id)
        .select("*, category:question_bank_categories(*)")
        .single();

      if (updateError) throw updateError;
      setQuestions((prev) => prev.map((q) => (q.id === id ? data : q)));
      toast.success("Question updated");
      return data;
    } catch (err) {
      console.error("Update question error:", err);
      toast.error("Failed to update question");
      return null;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
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
      const supabase = createClient();
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

  const importQuestions = async (questionsToImport: CreateQuestionInput[]): Promise<number> => {
    try {
      // Ensure profile is loaded before importing
      if (!profile?.tenant_id || !profile?.id) {
        console.error("Import failed: User profile not loaded", { profile });
        toast.error("Please wait for your profile to load and try again");
        return 0;
      }

      if (questionsToImport.length === 0) {
        toast.error("No questions to import");
        return 0;
      }

      const questionsWithMeta = questionsToImport.map((q) => ({
        ...q,
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        // Ensure correct_answer is valid JSONB (required field)
        correct_answer: q.correct_answer ?? { answerId: "a" },
      }));

      console.log("Importing questions:", questionsWithMeta.length);

      const supabase = createClient();
      const { data, error: insertError } = await (supabase as any)
        .from("question_bank")
        .insert(questionsWithMeta)
        .select();

      if (insertError) {
        console.error("Question bank insert error:", insertError);
        throw insertError;
      }

      toast.success(`${data?.length || 0} questions imported`);
      fetchQuestions();
      return data?.length || 0;
    } catch (err) {
      console.error("Import questions failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to import questions: ${errorMessage}`);
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

  useEffect(() => {
    if (!questionId) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
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
  }, [questionId]);

  return { stats, isLoading };
}

// Hook for adding questions from bank to an assignment
export function useAssignmentQuestions(assignmentId: string) {
  const [assignedQuestions, setAssignedQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignedQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
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
  }, [assignmentId]);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignedQuestions();
    }
  }, [assignmentId, fetchAssignedQuestions]);

  const addQuestion = async (questionId: string, orderIndex?: number): Promise<boolean> => {
    try {
      const supabase = createClient();
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
      const supabase = createClient();
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
      const supabase = createClient();
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

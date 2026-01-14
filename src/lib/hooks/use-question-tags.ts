"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type QuestionDifficulty = "easy" | "medium" | "hard" | "expert";
export type CognitiveLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export interface QuestionTag {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  category: string | null;
  description: string | null;
  created_at: string;
}

export interface NREMTCategory {
  id: string;
  code: string;
  name: string;
  certification_level: string;
  weight_percentage: number;
  description: string | null;
}

export interface QuestionMetadata {
  difficulty: QuestionDifficulty;
  cognitive_level: CognitiveLevel;
  nremt_category_id: string | null;
  rationale: string | null;
  tags: string[];
}

// Hook for managing question tags
export function useQuestionTags() {
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchTags = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("question_tags")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("category")
        .order("name");

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error("Failed to fetch question tags:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = async (input: {
    name: string;
    color?: string;
    category?: string;
    description?: string;
  }): Promise<QuestionTag | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("question_tags")
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          color: input.color || "blue",
          category: input.category || null,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      setTags((prev) => [...prev, data]);
      toast.success("Tag created");
      return data;
    } catch (err) {
      console.error("Failed to create tag:", err);
      toast.error("Failed to create tag");
      return null;
    }
  };

  const updateTag = async (id: string, updates: Partial<QuestionTag>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("question_tags")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      toast.success("Tag updated");
      return true;
    } catch (err) {
      toast.error("Failed to update tag");
      return false;
    }
  };

  const deleteTag = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("question_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete tag");
      return false;
    }
  };

  // Tag a question
  const tagQuestion = async (questionId: string, tagId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("quiz_question_tags")
        .insert({ question_id: questionId, tag_id: tagId });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to tag question:", err);
      return false;
    }
  };

  // Remove tag from question
  const untagQuestion = async (questionId: string, tagId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("quiz_question_tags")
        .delete()
        .eq("question_id", questionId)
        .eq("tag_id", tagId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to untag question:", err);
      return false;
    }
  };

  // Get tags for a question
  const getQuestionTags = async (questionId: string): Promise<QuestionTag[]> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("quiz_question_tags")
        .select("tag:question_tags(*)")
        .eq("question_id", questionId);

      if (error) throw error;
      return data?.map((d: { tag: QuestionTag }) => d.tag) || [];
    } catch (err) {
      console.error("Failed to get question tags:", err);
      return [];
    }
  };

  // Bulk tag questions
  const bulkTagQuestions = async (questionIds: string[], tagId: string): Promise<boolean> => {
    try {
      const inserts = questionIds.map((qid) => ({ question_id: qid, tag_id: tagId }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("quiz_question_tags")
        .upsert(inserts, { onConflict: "question_id,tag_id" });

      if (error) throw error;
      toast.success(`Tagged ${questionIds.length} questions`);
      return true;
    } catch (err) {
      toast.error("Failed to tag questions");
      return false;
    }
  };

  return {
    tags,
    isLoading,
    refetch: fetchTags,
    createTag,
    updateTag,
    deleteTag,
    tagQuestion,
    untagQuestion,
    getQuestionTags,
    bulkTagQuestions,
  };
}

// Hook for NREMT categories
export function useNREMTCategories(certificationLevel?: string) {
  const [categories, setCategories] = useState<NREMTCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("nremt_categories")
          .select("*")
          .order("name");

        if (certificationLevel) {
          query = query.eq("certification_level", certificationLevel);
        }

        const { data, error } = await query;
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to fetch NREMT categories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [certificationLevel, supabase]);

  return { categories, isLoading };
}

// Hook for updating question metadata
export function useQuestionMetadata(questionId: string) {
  const [metadata, setMetadata] = useState<QuestionMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!questionId) return;

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("quiz_questions")
          .select(`
            difficulty,
            cognitive_level,
            nremt_category_id,
            rationale,
            quiz_question_tags(tag_id)
          `)
          .eq("id", questionId)
          .single();

        if (error) throw error;

        setMetadata({
          difficulty: data.difficulty || "medium",
          cognitive_level: data.cognitive_level || "apply",
          nremt_category_id: data.nremt_category_id,
          rationale: data.rationale,
          tags: data.quiz_question_tags?.map((t: { tag_id: string }) => t.tag_id) || [],
        });
      } catch (err) {
        console.error("Failed to fetch question metadata:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [questionId, supabase]);

  const updateMetadata = async (updates: Partial<QuestionMetadata>): Promise<boolean> => {
    try {
      const { tags, ...dbUpdates } = updates;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("quiz_questions")
        .update(dbUpdates)
        .eq("id", questionId);

      if (error) throw error;

      setMetadata((prev) => (prev ? { ...prev, ...updates } : null));
      return true;
    } catch (err) {
      console.error("Failed to update question metadata:", err);
      return false;
    }
  };

  return { metadata, isLoading, updateMetadata };
}

// Tag color options
export const TAG_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "green", label: "Green", class: "bg-green-100 text-green-800 border-green-300" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "red", label: "Red", class: "bg-red-100 text-red-800 border-red-300" },
  { value: "purple", label: "Purple", class: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "pink", label: "Pink", class: "bg-pink-100 text-pink-800 border-pink-300" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "gray", label: "Gray", class: "bg-gray-100 text-gray-800 border-gray-300" },
];

// Difficulty options
export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", description: "Basic recall and recognition" },
  { value: "medium", label: "Medium", description: "Application of knowledge" },
  { value: "hard", label: "Hard", description: "Analysis and synthesis" },
  { value: "expert", label: "Expert", description: "Complex problem-solving" },
];

// Cognitive level options (Bloom's Taxonomy)
export const COGNITIVE_LEVEL_OPTIONS = [
  { value: "remember", label: "Remember", description: "Recall facts and basic concepts" },
  { value: "understand", label: "Understand", description: "Explain ideas or concepts" },
  { value: "apply", label: "Apply", description: "Use information in new situations" },
  { value: "analyze", label: "Analyze", description: "Draw connections among ideas" },
  { value: "evaluate", label: "Evaluate", description: "Justify a decision or course of action" },
  { value: "create", label: "Create", description: "Produce new or original work" },
];

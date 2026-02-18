"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyQuestionType =
  | "text"
  | "textarea"
  | "single_choice"
  | "multiple_choice"
  | "rating"
  | "scale"
  | "date";

export interface Survey {
  id: string;
  tenant_id: string;
  course_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: SurveyStatus;
  is_anonymous: boolean;
  allow_multiple_submissions: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
  questions?: SurveyQuestion[];
  response_count?: number;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
  is_required: boolean;
  order_index: number;
  settings: {
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    min_label?: string;
    max_label?: string;
  };
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  tenant_id: string;
  survey_id: string;
  user_id: string | null;
  answers: Record<string, string | string[] | number>;
  submitted_at: string;
}

export interface SurveySummary {
  total_responses: number;
  completion_rate: number | null;
  questions: Array<{
    question_id: string;
    question_text: string;
    question_type: SurveyQuestionType;
    response_count: number;
    summary: Record<string, number> | { average: number; min: number; max: number } | null;
  }>;
}

// Hook for managing surveys (instructor view)
export function useSurveys(courseId?: string) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSurveys = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("surveys")
        .select(`
          *,
          questions:survey_questions(count)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error("Failed to fetch surveys:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const createSurvey = async (input: {
    title: string;
    description?: string;
    instructions?: string;
    course_id?: string;
    is_anonymous?: boolean;
    allow_multiple_submissions?: boolean;
    available_from?: string;
    available_until?: string;
  }): Promise<Survey | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("surveys")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          title: input.title,
          description: input.description || null,
          instructions: input.instructions || null,
          course_id: input.course_id || courseId || null,
          is_anonymous: input.is_anonymous !== false,
          allow_multiple_submissions: input.allow_multiple_submissions || false,
          available_from: input.available_from || null,
          available_until: input.available_until || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      setSurveys((prev) => [data, ...prev]);
      toast.success("Survey created");
      return data;
    } catch (err) {
      console.error("Failed to create survey:", err);
      toast.error("Failed to create survey");
      return null;
    }
  };

  const updateSurvey = async (id: string, updates: Partial<Survey>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("surveys")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      toast.success("Survey updated");
      return true;
    } catch (err) {
      toast.error("Failed to update survey");
      return false;
    }
  };

  const publishSurvey = async (id: string): Promise<boolean> => {
    return updateSurvey(id, { status: "published" });
  };

  const closeSurvey = async (id: string): Promise<boolean> => {
    return updateSurvey(id, { status: "closed" });
  };

  const deleteSurvey = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("surveys")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      toast.success("Survey deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete survey");
      return false;
    }
  };

  const getSurveySummary = async (surveyId: string): Promise<SurveySummary | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_survey_summary", {
        p_survey_id: surveyId,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to get survey summary:", err);
      return null;
    }
  };

  return {
    surveys,
    isLoading,
    refetch: fetchSurveys,
    createSurvey,
    updateSurvey,
    publishSurvey,
    closeSurvey,
    deleteSurvey,
    getSurveySummary,
  };
}

// Hook for managing survey questions
export function useSurveyQuestions(surveyId: string) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchQuestions = useCallback(async () => {
    if (!surveyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index");

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId, supabase]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuestion = async (input: {
    question_text: string;
    question_type: SurveyQuestionType;
    options?: string[];
    is_required?: boolean;
    settings?: SurveyQuestion["settings"];
  }): Promise<SurveyQuestion | null> => {
    try {
      const maxOrder = questions.reduce((max, q) => Math.max(max, q.order_index), -1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("survey_questions")
        .insert({
          survey_id: surveyId,
          question_text: input.question_text,
          question_type: input.question_type,
          options: input.options || [],
          is_required: input.is_required || false,
          order_index: maxOrder + 1,
          settings: input.settings || {},
        })
        .select()
        .single();

      if (error) throw error;
      setQuestions((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("Failed to add question:", err);
      toast.error("Failed to add question");
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<SurveyQuestion>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("survey_questions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
      return true;
    } catch (err) {
      toast.error("Failed to update question");
      return false;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("survey_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete question");
      return false;
    }
  };

  const reorderQuestions = async (orderedIds: string[]): Promise<boolean> => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("survey_questions")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      setQuestions((prev) =>
        [...prev].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
      );
      return true;
    } catch (err) {
      toast.error("Failed to reorder questions");
      return false;
    }
  };

  return {
    questions,
    isLoading,
    refetch: fetchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}

// Hook for taking a survey (student view)
export function useSurveySubmission(surveyId: string) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [myResponse, setMyResponse] = useState<SurveyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!surveyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch survey
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: surveyData, error: surveyError } = await (supabase as any)
          .from("surveys")
          .select("*")
          .eq("id", surveyId)
          .single();

        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        // Fetch questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: questionsData, error: questionsError } = await (supabase as any)
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order_index");

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        // Check for existing response (if not anonymous)
        if (profile?.id && !surveyData.is_anonymous) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: responseData } = await (supabase as any)
            .from("survey_responses")
            .select("*")
            .eq("survey_id", surveyId)
            .eq("user_id", profile.id)
            .single();

          setMyResponse(responseData || null);
        }
      } catch (err) {
        console.error("Failed to fetch survey:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurveyData();
  }, [surveyId, profile?.id, supabase]);

  const submitSurvey = async (
    answers: Record<string, string | string[] | number>
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !surveyId) {
      toast.error("Unable to submit survey");
      return false;
    }

    // Validate required questions
    const missingRequired = questions
      .filter((q) => q.is_required)
      .filter((q) => {
        const answer = answers[q.id];
        if (!answer) return true;
        if (Array.isArray(answer) && answer.length === 0) return true;
        return false;
      });

    if (missingRequired.length > 0) {
      toast.error("Please answer all required questions");
      return false;
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("survey_responses")
        .insert({
          tenant_id: profile.tenant_id,
          survey_id: surveyId,
          user_id: survey?.is_anonymous ? null : profile.id,
          answers,
        })
        .select()
        .single();

      if (error) throw error;
      setMyResponse(data);
      toast.success("Survey submitted successfully");
      return true;
    } catch (err) {
      console.error("Failed to submit survey:", err);
      toast.error("Failed to submit survey");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = survey?.status === "published" &&
    (!survey.available_from || new Date(survey.available_from) <= new Date()) &&
    (!survey.available_until || new Date(survey.available_until) >= new Date()) &&
    (survey.allow_multiple_submissions || !myResponse);

  return {
    survey,
    questions,
    myResponse,
    isLoading,
    isSubmitting,
    submitSurvey,
    canSubmit,
    hasSubmitted: !!myResponse,
  };
}

// Question type options for UI
export const SURVEY_QUESTION_TYPES = [
  { value: "text", label: "Short Text", description: "Single line text input" },
  { value: "textarea", label: "Long Text", description: "Multi-line text input" },
  { value: "single_choice", label: "Single Choice", description: "Select one option" },
  { value: "multiple_choice", label: "Multiple Choice", description: "Select multiple options" },
  { value: "rating", label: "Rating", description: "Star rating (1-5)" },
  { value: "scale", label: "Scale", description: "Numeric scale (e.g., 1-10)" },
  { value: "date", label: "Date", description: "Date picker" },
];

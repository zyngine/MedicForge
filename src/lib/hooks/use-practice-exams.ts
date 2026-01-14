"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type PracticeExamMode = "study" | "practice" | "timed" | "adaptive";

export interface PracticeExamSession {
  id: string;
  tenant_id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  mode: PracticeExamMode;
  question_source: string;
  source_filters: Record<string, unknown> | null;
  question_count: number;
  time_limit_minutes: number | null;
  started_at: string;
  completed_at: string | null;
  current_question_index: number;
  score: number | null;
  total_correct: number;
  total_answered: number;
  performance_by_category: Record<string, { total: number; correct: number }>;
  created_at: string;
}

export interface PracticeExamQuestion {
  id: string;
  tenant_id: string;
  session_id: string;
  question_id: string;
  question_type: string;
  order_index: number;
  user_answer: unknown | null;
  is_correct: boolean | null;
  answered_at: string | null;
  time_spent_seconds: number | null;
  flagged: boolean;
  // Joined question data
  question_text?: string;
  options?: unknown;
  correct_answer?: unknown;
  explanation?: string;
  category?: string;
}

export interface WeakArea {
  id: string;
  tenant_id: string;
  user_id: string;
  category: string;
  subcategory: string | null;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  last_assessed: string | null;
  is_weak_area: boolean;
  improvement_trend: string | null;
}

// Hook for managing practice exam sessions
export function usePracticeExams() {
  const [sessions, setSessions] = useState<PracticeExamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("practice_exam_sessions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Failed to fetch practice sessions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, supabase]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const startSession = async (input: {
    title: string;
    mode: PracticeExamMode;
    question_source: string;
    source_filters?: Record<string, unknown>;
    question_count: number;
    time_limit_minutes?: number;
    course_id?: string;
  }): Promise<PracticeExamSession | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // Create the session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session, error: sessionError } = await (supabase as any)
        .from("practice_exam_sessions")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          course_id: input.course_id || null,
          title: input.title,
          mode: input.mode,
          question_source: input.question_source,
          source_filters: input.source_filters || null,
          question_count: input.question_count,
          time_limit_minutes: input.time_limit_minutes || null,
          started_at: new Date().toISOString(),
          performance_by_category: {},
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Fetch questions based on source
      let questions: Array<{ id: string; type: string }> = [];

      if (input.question_source === "weak_areas") {
        // Get weak area categories
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: weakAreas } = await (supabase as any)
          .from("student_weak_areas")
          .select("category")
          .eq("user_id", profile.id)
          .eq("is_weak_area", true);

        const weakCategories = (weakAreas || []).map((w: { category: string }) => w.category);

        if (weakCategories.length > 0) {
          // Get questions from weak categories
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: quizQuestions } = await (supabase as any)
            .from("quiz_questions")
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .overlaps("tags", weakCategories)
            .limit(input.question_count);

          questions = (quizQuestions || []).map((q: { id: string }) => ({
            id: q.id,
            type: "quiz",
          }));
        }
      } else if (input.question_source === "nremt_category") {
        // Get questions from specific NREMT category
        const categoryId = input.source_filters?.category_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: standardizedQuestions } = await (supabase as any)
          .from("standardized_questions")
          .select("id")
          .eq("tenant_id", profile.tenant_id)
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .limit(input.question_count);

        questions = (standardizedQuestions || []).map((q: { id: string }) => ({
          id: q.id,
          type: "standardized",
        }));
      } else {
        // Course questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("quiz_questions")
          .select("id")
          .eq("tenant_id", profile.tenant_id);

        if (input.course_id) {
          // Get assignment IDs for this course
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: assignments } = await (supabase as any)
            .from("assignments")
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .in("module_id",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (await (supabase as any)
                .from("modules")
                .select("id")
                .eq("course_id", input.course_id)).data?.map((m: { id: string }) => m.id) || []
            );

          if (assignments?.length) {
            query = query.in("assignment_id", assignments.map((a: { id: string }) => a.id));
          }
        }

        const { data: quizQuestions } = await query.limit(input.question_count);
        questions = (quizQuestions || []).map((q: { id: string }) => ({
          id: q.id,
          type: "quiz",
        }));
      }

      // Shuffle and limit questions
      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, input.question_count);

      // Create practice exam questions
      if (shuffled.length > 0) {
        const practiceQuestions = shuffled.map((q, index) => ({
          tenant_id: profile.tenant_id,
          session_id: session.id,
          question_id: q.id,
          question_type: q.type,
          order_index: index,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("practice_exam_questions")
          .insert(practiceQuestions);
      }

      setSessions((prev) => [session, ...prev]);
      toast.success("Practice exam started");
      return session;
    } catch (err) {
      console.error("Failed to start practice session:", err);
      toast.error("Failed to start practice exam");
      return null;
    }
  };

  const deleteSession = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("practice_exam_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete session");
      return false;
    }
  };

  // Stats
  const completedSessions = sessions.filter((s) => s.completed_at);
  const averageScore = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length
    : 0;

  return {
    sessions,
    completedSessions,
    averageScore,
    isLoading,
    refetch: fetchSessions,
    startSession,
    deleteSession,
  };
}

// Hook for active practice exam session
export function usePracticeExamSession(sessionId: string) {
  const [session, setSession] = useState<PracticeExamSession | null>(null);
  const [questions, setQuestions] = useState<PracticeExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSession = useCallback(async () => {
    if (!profile?.tenant_id || !sessionId) return;

    try {
      setIsLoading(true);

      // Fetch session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessionData, error: sessionError } = await (supabase as any)
        .from("practice_exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch questions with full question data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: questionsData, error: questionsError } = await (supabase as any)
        .from("practice_exam_questions")
        .select("*")
        .eq("session_id", sessionId)
        .order("order_index");

      if (questionsError) throw questionsError;

      // Enrich with question content
      const enrichedQuestions = await Promise.all(
        (questionsData || []).map(async (pq: PracticeExamQuestion) => {
          const table = pq.question_type === "quiz" ? "quiz_questions" : "standardized_questions";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: questionData } = await (supabase as any)
            .from(table)
            .select("question_text, options, correct_answer, explanation")
            .eq("id", pq.question_id)
            .single();

          return {
            ...pq,
            ...questionData,
          };
        })
      );

      setQuestions(enrichedQuestions);
      setQuestionStartTime(new Date());
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, sessionId, supabase]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const submitAnswer = async (
    questionId: string,
    answer: unknown
  ): Promise<{ isCorrect: boolean; correctAnswer: unknown } | null> => {
    if (!session) return null;

    const question = questions.find((q) => q.id === questionId);
    if (!question) return null;

    const timeSpent = questionStartTime
      ? Math.round((new Date().getTime() - questionStartTime.getTime()) / 1000)
      : 0;

    // Determine if correct
    const isCorrect = JSON.stringify(answer) === JSON.stringify(question.correct_answer);

    try {
      // Update the question
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("practice_exam_questions")
        .update({
          user_answer: answer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
        })
        .eq("id", questionId);

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, user_answer: answer, is_correct: isCorrect, answered_at: new Date().toISOString() }
            : q
        )
      );

      // Update session stats
      const newTotalAnswered = session.total_answered + 1;
      const newTotalCorrect = session.total_correct + (isCorrect ? 1 : 0);

      // Update performance by category
      const newPerformance = { ...session.performance_by_category };
      const category = question.category || "General";
      if (!newPerformance[category]) {
        newPerformance[category] = { total: 0, correct: 0 };
      }
      newPerformance[category].total += 1;
      if (isCorrect) newPerformance[category].correct += 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("practice_exam_sessions")
        .update({
          current_question_index: session.current_question_index + 1,
          total_answered: newTotalAnswered,
          total_correct: newTotalCorrect,
          performance_by_category: newPerformance,
        })
        .eq("id", sessionId);

      setSession((prev) =>
        prev
          ? {
              ...prev,
              current_question_index: prev.current_question_index + 1,
              total_answered: newTotalAnswered,
              total_correct: newTotalCorrect,
              performance_by_category: newPerformance,
            }
          : null
      );

      // Reset question timer
      setQuestionStartTime(new Date());

      return { isCorrect, correctAnswer: question.correct_answer };
    } catch (err) {
      console.error("Failed to submit answer:", err);
      return null;
    }
  };

  const toggleFlag = async (questionId: string): Promise<boolean> => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("practice_exam_questions")
        .update({ flagged: !question.flagged })
        .eq("id", questionId);

      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, flagged: !q.flagged } : q))
      );
      return true;
    } catch (err) {
      return false;
    }
  };

  const completeSession = async (): Promise<PracticeExamSession | null> => {
    if (!session) return null;

    const score = session.total_answered > 0
      ? Math.round((session.total_correct / session.total_answered) * 100)
      : 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("practice_exam_sessions")
        .update({
          completed_at: new Date().toISOString(),
          score,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;

      // Update weak areas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc("update_weak_areas", { p_session_id: sessionId });

      setSession(data);
      toast.success(`Practice exam completed! Score: ${score}%`);
      return data;
    } catch (err) {
      console.error("Failed to complete session:", err);
      return null;
    }
  };

  const currentQuestion = questions[session?.current_question_index || 0];
  const progress = session && session.question_count > 0
    ? (session.current_question_index / session.question_count) * 100
    : 0;
  const isComplete = session?.completed_at !== null;
  const flaggedQuestions = questions.filter((q) => q.flagged);
  const answeredQuestions = questions.filter((q) => q.answered_at);
  const unansweredQuestions = questions.filter((q) => !q.answered_at);

  return {
    session,
    questions,
    currentQuestion,
    isLoading,
    isComplete,
    progress,
    flaggedQuestions,
    answeredQuestions,
    unansweredQuestions,
    submitAnswer,
    toggleFlag,
    completeSession,
    refetch: fetchSession,
  };
}

// Hook for weak areas tracking
export function useWeakAreas() {
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchWeakAreas = async () => {
      if (!profile?.tenant_id || !profile?.id) return;

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("student_weak_areas")
          .select("*")
          .eq("user_id", profile.id)
          .order("accuracy_rate", { ascending: true });

        if (error) throw error;
        setWeakAreas(data || []);
      } catch (err) {
        console.error("Failed to fetch weak areas:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeakAreas();
  }, [profile?.tenant_id, profile?.id, supabase]);

  const actualWeakAreas = weakAreas.filter((w) => w.is_weak_area);
  const strengths = weakAreas.filter((w) => !w.is_weak_area && w.accuracy_rate >= 80);
  const improving = weakAreas.filter((w) => w.improvement_trend === "improving");

  return {
    weakAreas,
    actualWeakAreas,
    strengths,
    improving,
    isLoading,
  };
}

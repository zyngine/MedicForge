"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type ExamType = "entrance" | "unit" | "comprehensive" | "practice" | "remediation";
export type DeliveryMode = "standard" | "adaptive";
export type SecurityLevel = "low" | "medium" | "high";
export type AttemptStatus = "not_started" | "in_progress" | "submitted" | "timed_out" | "abandoned" | "graded" | "invalidated";

export interface ExamTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  exam_type: ExamType;
  certification_level: string;
  delivery_mode: DeliveryMode;
  security_level: SecurityLevel;
  total_questions: number | null;
  min_questions: number | null;
  max_questions: number | null;
  time_limit_minutes: number | null;
  category_weights: Record<string, number>;
  passing_score: number;
  is_system_template: boolean;
  is_active: boolean;
}

export interface StandardizedExam {
  id: string;
  tenant_id: string;
  template_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  available_from: string | null;
  available_until: string | null;
  question_ids: string[];
  status: string;
  template?: ExamTemplate;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string | null;
  submitted_at: string | null;
  time_used_seconds: number;
  current_theta: number;
  standard_error: number | null;
  questions_administered: number;
  question_sequence: string[];
}

export interface ExamQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: Array<{ id: string; text: string }>;
  difficulty: string;
  cognitive_level: string;
  nremt_category_id: string | null;
  rationale?: string;
}

export interface ExamResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  sequence_number: number;
  selected_answer: unknown;
  is_correct: boolean | null;
  points_earned: number | null;
  time_spent_seconds: number | null;
}

export interface ExamResult {
  id: string;
  attempt_id: string;
  raw_score: number;
  scaled_score: number;
  theta_score: number | null;
  percentile: number | null;
  category_scores: Record<string, { correct: number; total: number; percentage: number }>;
  passed: boolean;
  pass_probability: number | null;
  strengths: string[];
  weaknesses: string[];
  recommended_focus_areas: string[];
}

// Hook for exam templates
export function useExamTemplates(certificationLevel?: string) {
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("standardized_exam_templates")
          .select("*")
          .eq("is_active", true)
          .or(`tenant_id.is.null,tenant_id.eq.${profile?.tenant_id}`);

        if (certificationLevel) {
          query = query.eq("certification_level", certificationLevel);
        }

        const { data, error } = await query.order("name");
        if (error) throw error;
        setTemplates(data || []);
      } catch (err) {
        console.error("Failed to fetch exam templates:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (profile?.tenant_id) {
      fetchTemplates();
    }
  }, [profile?.tenant_id, certificationLevel, supabase]);

  return { templates, isLoading };
}

// Hook for managing standardized exams (instructor view)
export function useStandardizedExams(courseId?: string) {
  const [exams, setExams] = useState<StandardizedExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchExams = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("standardized_exams")
        .select(`
          *,
          template:standardized_exam_templates(*)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      console.error("Failed to fetch exams:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const createExam = async (input: {
    template_id: string;
    title: string;
    description?: string;
    instructions?: string;
    course_id?: string;
    available_from?: string;
    available_until?: string;
  }): Promise<StandardizedExam | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("standardized_exams")
        .insert({
          tenant_id: profile.tenant_id,
          template_id: input.template_id,
          course_id: input.course_id || courseId || null,
          title: input.title,
          description: input.description || null,
          instructions: input.instructions || null,
          available_from: input.available_from || null,
          available_until: input.available_until || null,
          status: "draft",
          created_by: profile.id,
        })
        .select(`*, template:standardized_exam_templates(*)`)
        .single();

      if (error) throw error;
      setExams((prev) => [data, ...prev]);
      toast.success("Exam created");
      return data;
    } catch (err) {
      console.error("Failed to create exam:", err);
      toast.error("Failed to create exam");
      return null;
    }
  };

  const updateExam = async (id: string, updates: Partial<StandardizedExam>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("standardized_exams")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      return true;
    } catch (err) {
      toast.error("Failed to update exam");
      return false;
    }
  };

  const publishExam = async (id: string): Promise<boolean> => {
    const result = await updateExam(id, { status: "scheduled" });
    if (result) toast.success("Exam published");
    return result;
  };

  const closeExam = async (id: string): Promise<boolean> => {
    const result = await updateExam(id, { status: "closed" });
    if (result) toast.success("Exam closed");
    return result;
  };

  return {
    exams,
    isLoading,
    refetch: fetchExams,
    createExam,
    updateExam,
    publishExam,
    closeExam,
  };
}

// Hook for taking an exam (student view)
export function useExamAttempt(examId: string) {
  const [exam, setExam] = useState<StandardizedExam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ExamQuestion | null>(null);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  // Fetch exam and existing attempt
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id || !examId) return;

      try {
        setIsLoading(true);

        // Fetch exam with template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: examData, error: examError } = await (supabase as any)
          .from("standardized_exams")
          .select(`*, template:standardized_exam_templates(*)`)
          .eq("id", examId)
          .single();

        if (examError) throw examError;
        setExam(examData);

        // Check for existing attempt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attemptData } = await (supabase as any)
          .from("exam_attempts")
          .select("*")
          .eq("exam_id", examId)
          .eq("student_id", profile.id)
          .order("attempt_number", { ascending: false })
          .limit(1)
          .single();

        if (attemptData) {
          setAttempt(attemptData);

          // Fetch responses
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: responsesData } = await (supabase as any)
            .from("exam_responses")
            .select("*")
            .eq("attempt_id", attemptData.id)
            .order("sequence_number");

          setResponses(responsesData || []);

          // If completed, fetch result
          if (attemptData.status === "graded") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: resultData } = await (supabase as any)
              .from("exam_results")
              .select("*")
              .eq("attempt_id", attemptData.id)
              .single();

            setResult(resultData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch exam data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.id, examId, supabase]);

  // Start exam attempt
  const startExam = async (): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id || !examId) {
      toast.error("Unable to start exam");
      return false;
    }

    try {
      const attemptNumber = attempt ? attempt.attempt_number + 1 : 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("exam_attempts")
        .insert({
          tenant_id: profile.tenant_id,
          exam_id: examId,
          student_id: profile.id,
          attempt_number: attemptNumber,
          status: "in_progress",
          started_at: new Date().toISOString(),
          current_theta: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setAttempt(data);

      // Get first question
      await getNextQuestion(data.id);

      toast.success("Exam started");
      return true;
    } catch (err) {
      console.error("Failed to start exam:", err);
      toast.error("Failed to start exam");
      return false;
    }
  };

  // Get next question (for CAT)
  const getNextQuestion = async (attemptId?: string): Promise<ExamQuestion | null> => {
    const targetAttemptId = attemptId || attempt?.id;
    if (!targetAttemptId) return null;

    try {
      // For CAT exams, use the selection function
      if (exam?.template?.delivery_mode === "adaptive") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: nextQuestionId, error: selectError } = await (supabase as any)
          .rpc("select_next_cat_question", {
            p_attempt_id: targetAttemptId,
            p_current_theta: attempt?.current_theta || 0,
            p_administered_questions: responses.map((r) => r.question_id),
          });

        if (selectError) throw selectError;

        if (nextQuestionId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: question, error: questionError } = await (supabase as any)
            .from("standardized_questions")
            .select("id, question_text, question_type, options, difficulty, cognitive_level, nremt_category_id")
            .eq("id", nextQuestionId)
            .single();

          if (questionError) throw questionError;
          setCurrentQuestion(question);
          return question;
        }
      } else {
        // For standard exams, get next from question_ids
        const questionIds = exam?.question_ids || [];
        const answeredIds = responses.map((r) => r.question_id);
        const nextId = questionIds.find((id: string) => !answeredIds.includes(id));

        if (nextId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: question, error } = await (supabase as any)
            .from("standardized_questions")
            .select("id, question_text, question_type, options, difficulty, cognitive_level")
            .eq("id", nextId)
            .single();

          if (error) throw error;
          setCurrentQuestion(question);
          return question;
        }
      }

      return null;
    } catch (err) {
      console.error("Failed to get next question:", err);
      return null;
    }
  };

  // Submit answer
  const submitAnswer = async (answer: unknown): Promise<boolean> => {
    if (!attempt?.id || !currentQuestion?.id) return false;

    setIsSubmitting(true);
    try {
      const sequenceNumber = responses.length + 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: responseData, error: responseError } = await (supabase as any)
        .from("exam_responses")
        .insert({
          attempt_id: attempt.id,
          question_id: currentQuestion.id,
          sequence_number: sequenceNumber,
          selected_answer: answer,
          presented_at: new Date().toISOString(),
          answered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (responseError) throw responseError;
      setResponses((prev) => [...prev, responseData]);

      // For CAT, update theta
      if (exam?.template?.delivery_mode === "adaptive") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newTheta } = await (supabase as any)
          .rpc("update_cat_theta", {
            p_attempt_id: attempt.id,
            p_question_id: currentQuestion.id,
            p_is_correct: responseData.is_correct,
          });

        setAttempt((prev) => (prev ? { ...prev, current_theta: newTheta } : null));

        // Check if CAT should terminate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: shouldEnd } = await (supabase as any)
          .rpc("should_terminate_cat", { p_attempt_id: attempt.id });

        if (shouldEnd) {
          await submitExam();
          return true;
        }
      }

      // Get next question
      const next = await getNextQuestion();
      if (!next) {
        // No more questions, auto-submit
        await submitExam();
      }

      return true;
    } catch (err) {
      console.error("Failed to submit answer:", err);
      toast.error("Failed to submit answer");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit exam
  const submitExam = async (): Promise<ExamResult | null> => {
    if (!attempt?.id) return null;

    setIsSubmitting(true);
    try {
      // Update attempt status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("exam_attempts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);

      // Calculate result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultData, error: resultError } = await (supabase as any)
        .rpc("calculate_exam_result", { p_attempt_id: attempt.id });

      if (resultError) throw resultError;

      setResult(resultData);
      setAttempt((prev) => (prev ? { ...prev, status: "graded" } : null));
      toast.success("Exam submitted");
      return resultData;
    } catch (err) {
      console.error("Failed to submit exam:", err);
      toast.error("Failed to submit exam");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    exam,
    attempt,
    currentQuestion,
    responses,
    result,
    isLoading,
    isSubmitting,
    startExam,
    submitAnswer,
    submitExam,
    questionsRemaining: exam?.template?.delivery_mode === "adaptive"
      ? (exam?.template?.max_questions || 150) - responses.length
      : (exam?.question_ids?.length || 0) - responses.length,
    progress: responses.length,
    isComplete: attempt?.status === "graded",
  };
}

// Hook for exam results (instructor view)
export function useExamResults(examId: string) {
  const [results, setResults] = useState<Array<ExamResult & { student: { full_name: string; email: string } }>>([]);
  const [stats, setStats] = useState<{
    totalAttempts: number;
    passCount: number;
    passRate: number;
    averageScore: number;
    medianScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchResults = async () => {
      if (!profile?.tenant_id || !examId) return;

      try {
        setIsLoading(true);

        // Fetch all results for this exam
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("exam_results")
          .select(`
            *,
            attempt:exam_attempts!inner(
              student_id,
              student:users!exam_attempts_student_id_fkey(full_name, email)
            )
          `)
          .eq("attempt.exam_id", examId);

        if (error) throw error;

        const formattedResults = data?.map((r: { attempt: { student: { full_name: string; email: string } }; raw_score: number; passed: boolean }) => ({
          ...r,
          student: r.attempt?.student,
        })) || [];

        setResults(formattedResults);

        // Calculate stats
        if (formattedResults.length > 0) {
          const scores = formattedResults.map((r: { raw_score: number }) => r.raw_score);
          const passCount = formattedResults.filter((r: { passed: boolean }) => r.passed).length;

          setStats({
            totalAttempts: formattedResults.length,
            passCount,
            passRate: (passCount / formattedResults.length) * 100,
            averageScore: scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
            medianScore: scores.sort((a: number, b: number) => a - b)[Math.floor(scores.length / 2)],
          });
        }
      } catch (err) {
        console.error("Failed to fetch exam results:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [profile?.tenant_id, examId, supabase]);

  return { results, stats, isLoading };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

// Types based on database schema from 20240402000000_nremt_exam_system.sql

export type ExamType = "standard" | "cat";
export type ExamStatus = "draft" | "published" | "archived";
export type AttemptStatus = "in_progress" | "completed" | "timed_out" | "abandoned";

export interface ExamTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  exam_type: ExamType;
  certification_level: string;
  total_questions: number;
  time_limit_minutes: number | null;
  passing_score: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_immediately: boolean;
  allow_review: boolean;
  max_attempts: number | null;
  cat_config: CATConfig | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CATConfig {
  min_questions: number;
  max_questions: number;
  initial_theta: number;
  termination_se: number;
  content_constraints?: Record<string, { min: number; max: number }>;
}

export interface StandardizedQuestion {
  id: string;
  tenant_id: string | null;
  template_id: string;
  question_bank_id: string | null;
  question_text: string;
  question_type: string;
  options: { id: string; text: string; isCorrect?: boolean }[] | null;
  correct_answer: unknown;
  explanation: string | null;
  points: number;
  difficulty: string;
  irt_difficulty: number | null;
  irt_discrimination: number | null;
  irt_guessing: number | null;
  category: string | null;
  order_index: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  tenant_id: string;
  template_id: string;
  student_id: string;
  course_id: string | null;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
  current_theta: number | null;
  current_se: number | null;
  questions_answered: number;
  created_at: string;
  template?: ExamTemplate;
}

export interface ExamResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  response: unknown;
  is_correct: boolean | null;
  points_earned: number | null;
  time_spent_seconds: number | null;
  theta_after: number | null;
  se_after: number | null;
  responded_at: string;
  question?: StandardizedQuestion;
}

export interface ExamResult {
  id: string;
  attempt_id: string;
  raw_score: number;
  percentage_score: number;
  scaled_score: number | null;
  passed: boolean;
  final_theta: number | null;
  final_se: number | null;
  category_scores: Record<string, { correct: number; total: number; percentage: number }> | null;
  percentile_rank: number | null;
  time_spent_seconds: number;
  feedback: string | null;
  created_at: string;
}

export interface StandardizedExam {
  id: string;
  tenant_id: string;
  template_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  available_from: string | null;
  available_until: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  template?: ExamTemplate;
}

// Hook for exam templates (admin/instructor use)
export function useExamTemplates() {
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("standardized_exam_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch templates"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, error, refetch: fetchTemplates };
}

export function useExamTemplate(templateId: string | undefined) {
  const [template, setTemplate] = useState<ExamTemplate | null>(null);
  const [questions, setQuestions] = useState<StandardizedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!templateId) {
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [templateRes, questionsRes] = await Promise.all([
          (supabase as any)
            .from("standardized_exam_templates")
            .select("*")
            .eq("id", templateId)
            .single(),
          (supabase as any)
            .from("standardized_questions")
            .select("*")
            .eq("template_id", templateId)
            .eq("is_active", true)
            .order("order_index"),
        ]);

        if (templateRes.error) throw templateRes.error;
        setTemplate(templateRes.data);
        setQuestions(questionsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch template:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, supabase]);

  return { template, questions, isLoading };
}

// Hook for standardized exams (course-specific instances)
export function useStandardizedExams(courseId?: string) {
  const [exams, setExams] = useState<StandardizedExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("standardized_exams")
        .select("*, template:standardized_exam_templates(*)")
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
  }, [courseId, supabase]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const createExam = async (input: Partial<StandardizedExam>): Promise<StandardizedExam | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("standardized_exams")
        .insert({
          ...input,
          tenant_id: profile?.tenant_id,
          created_by: profile?.id,
        })
        .select("*, template:standardized_exam_templates(*)")
        .single();

      if (error) throw error;
      setExams((prev) => [data, ...prev]);
      toast.success("Exam created successfully");
      return data;
    } catch (err) {
      toast.error("Failed to create exam");
      return null;
    }
  };

  const updateExam = async (id: string, input: Partial<StandardizedExam>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("standardized_exams")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      await fetchExams();
      toast.success("Exam updated");
      return true;
    } catch (err) {
      toast.error("Failed to update exam");
      return false;
    }
  };

  const deleteExam = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("standardized_exams")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast.success("Exam deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete exam");
      return false;
    }
  };

  return { exams, isLoading, refetch: fetchExams, createExam, updateExam, deleteExam };
}

// Hook for exam attempts
export function useExamAttempts(templateId?: string) {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!templateId) {
      setIsLoading(false);
      return;
    }

    const fetchAttempts = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("exam_attempts")
          .select("*, template:standardized_exam_templates(*)")
          .eq("template_id", templateId)
          .order("started_at", { ascending: false });

        if (error) throw error;
        setAttempts(data || []);
      } catch (err) {
        console.error("Failed to fetch attempts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [templateId, supabase]);

  return { attempts, isLoading };
}

export function useMyExamAttempts() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchAttempts = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("exam_attempts")
          .select("*, template:standardized_exam_templates(*)")
          .eq("student_id", user.id)
          .order("started_at", { ascending: false });

        if (error) throw error;
        setAttempts(data || []);
      } catch (err) {
        console.error("Failed to fetch attempts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [user?.id, supabase]);

  return { attempts, isLoading };
}

// Hook to start an exam attempt
export function useStartExamAttempt() {
  const [isStarting, setIsStarting] = useState(false);
  const { user, profile } = useUser();
  const supabase = createClient();

  const startAttempt = async (
    templateId: string,
    courseId?: string
  ): Promise<{ attempt: ExamAttempt; firstQuestion: StandardizedQuestion } | null> => {
    if (!user?.id || !profile?.tenant_id) {
      toast.error("You must be logged in to start an exam");
      return null;
    }

    try {
      setIsStarting(true);

      // Get template to check max attempts and exam type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: template, error: templateError } = await (supabase as any)
        .from("standardized_exam_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Check existing attempts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingAttempts, error: attemptsError } = await (supabase as any)
        .from("exam_attempts")
        .select("id")
        .eq("template_id", templateId)
        .eq("student_id", user.id);

      if (attemptsError) throw attemptsError;

      if (template.max_attempts && existingAttempts.length >= template.max_attempts) {
        toast.error("Maximum attempts reached");
        return null;
      }

      // Create new attempt
      const attemptNumber = existingAttempts.length + 1;
      const catConfig = template.cat_config as CATConfig | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: attempt, error: createError } = await (supabase as any)
        .from("exam_attempts")
        .insert({
          tenant_id: profile.tenant_id,
          template_id: templateId,
          student_id: user.id,
          course_id: courseId,
          attempt_number: attemptNumber,
          status: "in_progress",
          started_at: new Date().toISOString(),
          current_theta: template.exam_type === "cat" ? (catConfig?.initial_theta || 0) : null,
          current_se: template.exam_type === "cat" ? 1.0 : null,
          questions_answered: 0,
        })
        .select("*")
        .single();

      if (createError) throw createError;

      // Get first question
      let firstQuestion: StandardizedQuestion;

      if (template.exam_type === "cat") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: catQuestion, error: catError } = await (supabase as any)
          .rpc("select_next_cat_question", {
            p_attempt_id: attempt.id,
            p_template_id: templateId,
            p_current_theta: catConfig?.initial_theta || 0,
          });

        if (catError) throw catError;
        firstQuestion = catQuestion;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("standardized_questions")
          .select("*")
          .eq("template_id", templateId)
          .eq("is_active", true);

        if (template.randomize_questions) {
          const { data: allQuestions } = await query;
          const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
          firstQuestion = shuffled[0];
        } else {
          const { data: orderedQuestions } = await query.order("order_index").limit(1);
          firstQuestion = orderedQuestions[0];
        }
      }

      toast.success("Exam started");
      return { attempt, firstQuestion };
    } catch (err) {
      console.error("Failed to start exam:", err);
      toast.error("Failed to start exam");
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  return { startAttempt, isStarting };
}

// Hook for exam session (submitting responses)
export function useExamSession(attemptId: string | undefined) {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<StandardizedQuestion | null>(null);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const fetchNextQuestion = useCallback(async (currentAttempt: ExamAttempt, currentResponses: ExamResponse[]) => {
    const template = currentAttempt.template;
    if (!template) return;

    const answeredIds = currentResponses.map((r) => r.question_id);

    if (template.exam_type === "cat") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: nextQuestion, error } = await (supabase as any)
        .rpc("select_next_cat_question", {
          p_attempt_id: currentAttempt.id,
          p_template_id: template.id,
          p_current_theta: currentAttempt.current_theta || 0,
        });

      if (!error && nextQuestion) {
        setCurrentQuestion(nextQuestion);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("standardized_questions")
        .select("*")
        .eq("template_id", template.id)
        .eq("is_active", true);

      if (answeredIds.length > 0) {
        query = query.not("id", "in", `(${answeredIds.join(",")})`);
      }

      if (!template.randomize_questions) {
        query = query.order("order_index");
      }

      const { data: questions } = await query.limit(1);
      if (questions && questions.length > 0) {
        setCurrentQuestion(questions[0]);
      } else {
        setCurrentQuestion(null);
      }
    }
  }, [supabase]);

  useEffect(() => {
    if (!attemptId) {
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        setIsLoading(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attemptData, error: attemptError } = await (supabase as any)
          .from("exam_attempts")
          .select("*, template:standardized_exam_templates(*)")
          .eq("id", attemptId)
          .single();

        if (attemptError) throw attemptError;
        setAttempt(attemptData);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: responsesData, error: responsesError } = await (supabase as any)
          .from("exam_responses")
          .select("*, question:standardized_questions(*)")
          .eq("attempt_id", attemptId)
          .order("responded_at");

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);

        if (attemptData.status === "in_progress") {
          await fetchNextQuestion(attemptData, responsesData || []);
        }
      } catch (err) {
        console.error("Failed to fetch exam session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [attemptId, supabase, fetchNextQuestion]);

  const completeExam = useCallback(async (currentAttempt: ExamAttempt, currentResponses: ExamResponse[]) => {
    try {
      const correctCount = currentResponses.filter((r) => r.is_correct).length;
      const totalPoints = currentResponses.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      const maxPoints = currentResponses.reduce((sum, r) => sum + (r.question?.points || 1), 0);
      const percentageScore = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

      const categoryScores: Record<string, { correct: number; total: number; percentage: number }> = {};
      for (const response of currentResponses) {
        const category = response.question?.category || "General";
        if (!categoryScores[category]) {
          categoryScores[category] = { correct: 0, total: 0, percentage: 0 };
        }
        categoryScores[category].total++;
        if (response.is_correct) {
          categoryScores[category].correct++;
        }
      }
      for (const cat of Object.keys(categoryScores)) {
        categoryScores[cat].percentage = (categoryScores[cat].correct / categoryScores[cat].total) * 100;
      }

      const timeSpent = currentResponses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0);
      const passed = percentageScore >= (currentAttempt.template?.passing_score || 70);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("exam_attempts")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
        })
        .eq("id", currentAttempt.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("exam_results")
        .insert({
          attempt_id: currentAttempt.id,
          raw_score: correctCount,
          percentage_score: percentageScore,
          scaled_score: currentAttempt.current_theta ? Math.round((currentAttempt.current_theta + 3) * 166.67) : null,
          passed,
          final_theta: currentAttempt.current_theta,
          final_se: currentAttempt.current_se,
          category_scores: categoryScores,
          time_spent_seconds: timeSpent,
        });

      setAttempt((prev) => prev ? { ...prev, status: "completed" } : null);
      toast.success(passed ? "Exam completed - Passed!" : "Exam completed");
    } catch (err) {
      console.error("Failed to complete exam:", err);
    }
  }, [supabase]);

  const submitResponse = async (
    questionId: string,
    response: unknown,
    timeSpentSeconds: number
  ): Promise<{ isComplete: boolean; nextQuestion?: StandardizedQuestion } | null> => {
    if (!attempt || !attempt.template) return null;

    try {
      setIsSubmitting(true);
      const template = attempt.template;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: question, error: qError } = await (supabase as any)
        .from("standardized_questions")
        .select("*")
        .eq("id", questionId)
        .single();

      if (qError) throw qError;

      let isCorrect = false;
      if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
        const correctAnswer = question.correct_answer as { id?: string; index?: number };
        const userAnswer = response as { id?: string; index?: number };
        isCorrect = correctAnswer.id === userAnswer.id || correctAnswer.index === userAnswer.index;
      } else if (question.question_type === "short_answer") {
        const correctAnswer = (question.correct_answer as { text?: string })?.text?.toLowerCase();
        const userAnswer = (response as string)?.toLowerCase();
        isCorrect = correctAnswer === userAnswer;
      }

      let newTheta = attempt.current_theta;
      let newSe = attempt.current_se;

      if (template.exam_type === "cat" && attempt.current_theta !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedTheta, error: thetaError } = await (supabase as any)
          .rpc("update_cat_theta", {
            p_current_theta: attempt.current_theta,
            p_difficulty: question.irt_difficulty || 0,
            p_discrimination: question.irt_discrimination || 1,
            p_is_correct: isCorrect,
          });

        if (!thetaError && updatedTheta) {
          newTheta = updatedTheta.theta;
          newSe = updatedTheta.se;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newResponse, error: responseError } = await (supabase as any)
        .from("exam_responses")
        .insert({
          attempt_id: attempt.id,
          question_id: questionId,
          response,
          is_correct: isCorrect,
          points_earned: isCorrect ? question.points : 0,
          time_spent_seconds: timeSpentSeconds,
          theta_after: newTheta,
          se_after: newSe,
          responded_at: new Date().toISOString(),
        })
        .select("*, question:standardized_questions(*)")
        .single();

      if (responseError) throw responseError;

      const updatedResponses = [...responses, newResponse];
      setResponses(updatedResponses);

      const questionsAnswered = attempt.questions_answered + 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("exam_attempts")
        .update({
          questions_answered: questionsAnswered,
          current_theta: newTheta,
          current_se: newSe,
        })
        .eq("id", attempt.id);

      const updatedAttempt = {
        ...attempt,
        questions_answered: questionsAnswered,
        current_theta: newTheta,
        current_se: newSe,
      };
      setAttempt(updatedAttempt);

      let shouldEnd = false;
      const catConfig = template.cat_config as CATConfig | null;

      if (template.exam_type === "cat") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: terminate } = await (supabase as any)
          .rpc("should_terminate_cat", {
            p_attempt_id: attempt.id,
            p_questions_answered: questionsAnswered,
            p_current_se: newSe,
            p_min_questions: catConfig?.min_questions || 10,
            p_max_questions: catConfig?.max_questions || 50,
            p_termination_se: catConfig?.termination_se || 0.3,
          });

        shouldEnd = terminate;
      } else {
        shouldEnd = questionsAnswered >= template.total_questions;
      }

      if (shouldEnd) {
        await completeExam(updatedAttempt, updatedResponses);
        return { isComplete: true };
      }

      await fetchNextQuestion(updatedAttempt, updatedResponses);

      return { isComplete: false, nextQuestion: currentQuestion || undefined };
    } catch (err) {
      console.error("Failed to submit response:", err);
      toast.error("Failed to submit answer");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const abandonExam = async () => {
    if (!attempt) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("exam_attempts")
        .update({ status: "abandoned" })
        .eq("id", attempt.id);

      setAttempt((prev) => prev ? { ...prev, status: "abandoned" } : null);
      toast.info("Exam abandoned");
    } catch (err) {
      console.error("Failed to abandon exam:", err);
    }
  };

  return {
    attempt,
    currentQuestion,
    responses,
    isLoading,
    isSubmitting,
    submitResponse,
    abandonExam,
    questionsRemaining: attempt?.template?.total_questions
      ? attempt.template.total_questions - (attempt.questions_answered || 0)
      : null,
  };
}

// Hook to get exam result
export function useExamResult(attemptId: string | undefined) {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!attemptId) {
      setIsLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        setIsLoading(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [resultRes, responsesRes] = await Promise.all([
          (supabase as any)
            .from("exam_results")
            .select("*")
            .eq("attempt_id", attemptId)
            .single(),
          (supabase as any)
            .from("exam_responses")
            .select("*, question:standardized_questions(*)")
            .eq("attempt_id", attemptId)
            .order("responded_at"),
        ]);

        if (resultRes.data) {
          setResult(resultRes.data);
        }
        setResponses(responsesRes.data || []);
      } catch (err) {
        console.error("Failed to fetch result:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [attemptId, supabase]);

  return { result, responses, isLoading };
}

// Hook for students to see available exams
export function useAvailableExams(courseId?: string) {
  const [exams, setExams] = useState<StandardizedExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setIsLoading(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("standardized_exams")
          .select("*, template:standardized_exam_templates(*)")
          .eq("is_published", true);

        if (courseId) {
          query = query.eq("course_id", courseId);
        }

        const now = new Date().toISOString();
        query = query
          .or(`available_from.is.null,available_from.lte.${now}`)
          .or(`available_until.is.null,available_until.gte.${now}`);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        setExams(data || []);
      } catch (err) {
        console.error("Failed to fetch available exams:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [courseId, supabase]);

  return { exams, isLoading };
}

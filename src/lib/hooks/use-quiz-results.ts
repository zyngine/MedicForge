"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "matching" | null;
  options: string[] | null;
  correct_answer: number | string | boolean;
  points: number;
  order_index: number;
  explanation: string | null;
  is_excluded: boolean;
  excluded_at: string | null;
  excluded_by: string | null;
  exclusion_reason: string | null;
}

export interface StudentAnswer {
  submissionId: string;
  studentId: string;
  studentName: string;
  answer: number | string | boolean | null;
  isCorrect: boolean;
  submittedAt: string;
}

export interface QuestionAnalytics {
  question: QuizQuestion;
  totalResponses: number;
  correctCount: number;
  incorrectCount: number;
  percentCorrect: number;
  // For multiple choice - distribution of answers
  answerDistribution: {
    option: string | number;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }[];
  studentAnswers: StudentAnswer[];
}

export interface QuizResultsStats {
  totalQuestions: number;
  totalActiveQuestions: number;
  excludedQuestions: number;
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  totalPointsPossible: number;
  activePointsPossible: number;
}

export function useQuizResults(assignmentId: string) {
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [analytics, setAnalytics] = React.useState<QuestionAnalytics[]>([]);
  const [stats, setStats] = React.useState<QuizResultsStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchResults = React.useCallback(async () => {
    if (!profile?.tenant_id || !assignmentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch questions for this assignment
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      // Fetch all submissions with student info
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select(`
          id,
          student_id,
          content,
          submitted_at,
          raw_score,
          final_score,
          student:users!submissions_student_id_fkey(id, full_name)
        `)
        .eq("assignment_id", assignmentId)
        .in("status", ["submitted", "graded"]);

      if (submissionsError) throw submissionsError;

      // Process questions
      const processedQuestions: QuizQuestion[] = (questionsData || []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options as string[] | null,
        correct_answer: q.correct_answer as number | string | boolean,
        points: q.points || 1,
        order_index: q.order_index || 0,
        explanation: q.explanation,
        is_excluded: q.is_excluded || false,
        excluded_at: q.excluded_at,
        excluded_by: q.excluded_by,
        exclusion_reason: q.exclusion_reason,
      }));

      setQuestions(processedQuestions);

      // Calculate analytics for each question
      const analyticsData: QuestionAnalytics[] = processedQuestions.map((question) => {
        const studentAnswers: StudentAnswer[] = [];
        const answerCounts: Record<string, number> = {};
        let correctCount = 0;

        for (const submission of submissionsData || []) {
          if (!submission.content) continue;

          const content = typeof submission.content === "string"
            ? JSON.parse(submission.content)
            : submission.content;

          const answers = content.answers || {};
          const studentAnswer = answers[question.id];

          // Parse correct answer for comparison
          let correctAnswer = question.correct_answer;
          if (typeof correctAnswer === "string") {
            try {
              correctAnswer = JSON.parse(correctAnswer);
            } catch {
              // Keep as string
            }
          }

          const isCorrect = studentAnswer === correctAnswer;
          if (isCorrect) correctCount++;

          // Track answer distribution
          const answerKey = studentAnswer !== null && studentAnswer !== undefined
            ? String(studentAnswer)
            : "unanswered";
          answerCounts[answerKey] = (answerCounts[answerKey] || 0) + 1;

          studentAnswers.push({
            submissionId: submission.id,
            studentId: submission.student_id,
            studentName: (submission.student as { full_name: string })?.full_name || "Unknown",
            answer: studentAnswer,
            isCorrect,
            submittedAt: submission.submitted_at || "",
          });
        }

        const totalResponses = studentAnswers.length;
        const percentCorrect = totalResponses > 0
          ? Math.round((correctCount / totalResponses) * 100)
          : 0;

        // Build answer distribution
        const answerDistribution = Object.entries(answerCounts).map(([option, count]) => {
          let isCorrect = false;
          let correctAnswer = question.correct_answer;
          if (typeof correctAnswer === "string") {
            try {
              correctAnswer = JSON.parse(correctAnswer);
            } catch {
              // Keep as string
            }
          }
          isCorrect = String(correctAnswer) === option;

          return {
            option: option === "unanswered" ? "No Answer" : option,
            count,
            percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
            isCorrect,
          };
        }).sort((a, b) => b.count - a.count);

        return {
          question,
          totalResponses,
          correctCount,
          incorrectCount: totalResponses - correctCount,
          percentCorrect,
          answerDistribution,
          studentAnswers,
        };
      });

      setAnalytics(analyticsData);

      // Calculate overall stats
      const totalQuestions = processedQuestions.length;
      const excludedQuestions = processedQuestions.filter((q) => q.is_excluded).length;
      const activeQuestions = processedQuestions.filter((q) => !q.is_excluded);
      const totalSubmissions = submissionsData?.length || 0;

      const scores = (submissionsData || [])
        .map((s) => s.final_score ?? s.raw_score ?? 0)
        .sort((a, b) => a - b);

      const totalPointsPossible = processedQuestions.reduce((sum, q) => sum + q.points, 0);
      const activePointsPossible = activeQuestions.reduce((sum, q) => sum + q.points, 0);

      const statsData: QuizResultsStats = {
        totalQuestions,
        totalActiveQuestions: activeQuestions.length,
        excludedQuestions,
        totalSubmissions,
        averageScore: scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : 0,
        highestScore: scores.length > 0 ? scores[scores.length - 1] : 0,
        lowestScore: scores.length > 0 ? scores[0] : 0,
        medianScore: scores.length > 0
          ? scores.length % 2 === 0
            ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
            : scores[Math.floor(scores.length / 2)]
          : 0,
        totalPointsPossible,
        activePointsPossible,
      };

      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch quiz results:", err);
      toast.error("Failed to load quiz results");
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, assignmentId, supabase]);

  React.useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const excludeQuestion = async (
    questionId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          is_excluded: true,
          excluded_at: new Date().toISOString(),
          excluded_by: profile.id,
          exclusion_reason: reason || null,
        })
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question excluded");
      await fetchResults();
      return true;
    } catch (err) {
      console.error("Failed to exclude question:", err);
      toast.error("Failed to exclude question");
      return false;
    }
  };

  const includeQuestion = async (questionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          is_excluded: false,
          excluded_at: null,
          excluded_by: null,
          exclusion_reason: null,
        })
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question included");
      await fetchResults();
      return true;
    } catch (err) {
      console.error("Failed to include question:", err);
      toast.error("Failed to include question");
      return false;
    }
  };

  const recalculateScores = async (): Promise<number> => {
    if (!profile?.tenant_id) return 0;

    setIsRecalculating(true);

    try {
      // Get all active questions (not excluded)
      const activeQuestions = questions.filter((q) => !q.is_excluded);
      const totalPoints = activeQuestions.reduce((sum, q) => sum + q.points, 0);

      if (totalPoints === 0) {
        toast.error("No active questions to grade");
        return 0;
      }

      // Fetch all submissions
      const { data: submissions, error: fetchError } = await supabase
        .from("submissions")
        .select("id, content")
        .eq("assignment_id", assignmentId)
        .in("status", ["submitted", "graded"]);

      if (fetchError) throw fetchError;

      let updatedCount = 0;

      for (const submission of submissions || []) {
        if (!submission.content) continue;

        const content = typeof submission.content === "string"
          ? JSON.parse(submission.content)
          : submission.content;

        const answers = content.answers || {};

        // Calculate new score based only on active questions
        let newScore = 0;
        for (const question of activeQuestions) {
          const studentAnswer = answers[question.id];
          let correctAnswer = question.correct_answer;

          if (typeof correctAnswer === "string") {
            try {
              correctAnswer = JSON.parse(correctAnswer);
            } catch {
              // Keep as string
            }
          }

          if (studentAnswer === correctAnswer) {
            newScore += question.points;
          }
        }

        // Update the submission
        const { error: updateError } = await supabase
          .from("submissions")
          .update({
            raw_score: newScore,
            final_score: newScore,
          })
          .eq("id", submission.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      toast.success(`Recalculated scores for ${updatedCount} submissions`);
      await fetchResults();
      return updatedCount;
    } catch (err) {
      console.error("Failed to recalculate scores:", err);
      toast.error("Failed to recalculate scores");
      return 0;
    } finally {
      setIsRecalculating(false);
    }
  };

  // Get questions sorted by performance (worst performing first)
  const questionsByDifficulty = React.useMemo(() => {
    return [...analytics].sort((a, b) => a.percentCorrect - b.percentCorrect);
  }, [analytics]);

  // Get flagged questions (low performance, might need review)
  const problematicQuestions = React.useMemo(() => {
    return analytics.filter((a) => a.percentCorrect < 50 && !a.question.is_excluded);
  }, [analytics]);

  return {
    questions,
    analytics,
    stats,
    isLoading,
    isRecalculating,
    questionsByDifficulty,
    problematicQuestions,
    excludeQuestion,
    includeQuestion,
    recalculateScores,
    refetch: fetchResults,
  };
}

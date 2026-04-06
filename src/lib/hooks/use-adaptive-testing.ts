"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

// IRT (Item Response Theory) parameters for questions
export interface IRTParameters {
  difficulty: number; // b parameter (-3 to +3, 0 is average)
  discrimination: number; // a parameter (how well item discriminates, typically 0.5-2.5)
  guessing: number; // c parameter (probability of correct guess, typically 0.25 for 4-choice)
}

export interface CATQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: { id: string; text: string; isCorrect?: boolean }[];
  correct_answer: unknown;
  explanation: string | null;
  category: string;
  irt_parameters: IRTParameters;
}

export interface CATSession {
  id: string;
  tenant_id: string;
  student_id: string;
  assignment_id: string | null;
  status: "in_progress" | "completed" | "abandoned";
  current_ability: number;
  ability_se: number; // Standard error of ability estimate
  questions_answered: number;
  questions_correct: number;
  response_history: {
    question_id: string;
    response: string;
    correct: boolean;
    ability_after: number;
    time_seconds: number;
  }[];
  started_at: string;
  completed_at: string | null;
  final_score: number | null;
  pass_fail: "pass" | "fail" | null;
}

export interface CATConfig {
  minQuestions: number; // Minimum questions before stopping
  maxQuestions: number; // Maximum questions allowed
  stoppingRule: "fixed" | "precision" | "classification";
  targetSE: number; // Target standard error for precision stopping (typically 0.3-0.5)
  passingAbility: number; // Ability threshold for pass/fail (typically 0)
  initialAbility: number; // Starting ability estimate (typically 0)
  difficultyRange: [number, number]; // Range of difficulty to use
}

const DEFAULT_CONFIG: CATConfig = {
  minQuestions: 60,
  maxQuestions: 120,
  stoppingRule: "classification",
  targetSE: 0.3,
  passingAbility: 0,
  initialAbility: 0,
  difficultyRange: [-3, 3],
};

// 3-Parameter Logistic Model (3PL) probability function
function probability3PL(
  ability: number,
  difficulty: number,
  discrimination: number,
  guessing: number
): number {
  const exponent = discrimination * (ability - difficulty);
  return guessing + (1 - guessing) / (1 + Math.exp(-exponent));
}

// Fisher Information for item
function fisherInformation(
  ability: number,
  difficulty: number,
  discrimination: number,
  guessing: number
): number {
  const p = probability3PL(ability, difficulty, discrimination, guessing);
  const q = 1 - p;
  const pStar = (p - guessing) / (1 - guessing);

  return (discrimination ** 2 * q * pStar ** 2) / (p * (1 - guessing) ** 2);
}

// Maximum Likelihood Estimation for ability
function estimateAbility(
  responses: { difficulty: number; discrimination: number; guessing: number; correct: boolean }[],
  prior: number = 0
): { ability: number; se: number } {
  if (responses.length === 0) {
    return { ability: prior, se: 1 };
  }

  let ability = prior;
  const maxIterations = 50;
  const convergence = 0.001;

  // Newton-Raphson iteration
  for (let i = 0; i < maxIterations; i++) {
    let sumNumerator = 0;
    let sumDenominator = 0;

    for (const r of responses) {
      const p = probability3PL(ability, r.difficulty, r.discrimination, r.guessing);
      const pStar = (p - r.guessing) / (1 - r.guessing);
      const u = r.correct ? 1 : 0;

      sumNumerator += r.discrimination * pStar * (u - p) / p;
      sumDenominator += (r.discrimination ** 2) * pStar * (1 - p) * p / (p ** 2);
    }

    // Add small prior to prevent extreme estimates
    sumNumerator -= 0.01 * (ability - prior);
    sumDenominator += 0.01;

    const delta = sumNumerator / sumDenominator;
    ability += delta;

    // Constrain ability to reasonable range
    ability = Math.max(-4, Math.min(4, ability));

    if (Math.abs(delta) < convergence) break;
  }

  // Calculate standard error
  let information = 0;
  for (const r of responses) {
    information += fisherInformation(ability, r.difficulty, r.discrimination, r.guessing);
  }

  const se = information > 0 ? 1 / Math.sqrt(information) : 1;

  return { ability, se };
}

// Select next item based on maximum information
function selectNextItem(
  availableQuestions: CATQuestion[],
  currentAbility: number,
  answeredIds: Set<string>
): CATQuestion | null {
  let bestQuestion: CATQuestion | null = null;
  let maxInfo = -Infinity;

  for (const q of availableQuestions) {
    if (answeredIds.has(q.id)) continue;

    const info = fisherInformation(
      currentAbility,
      q.irt_parameters.difficulty,
      q.irt_parameters.discrimination,
      q.irt_parameters.guessing
    );

    if (info > maxInfo) {
      maxInfo = info;
      bestQuestion = q;
    }
  }

  return bestQuestion;
}

// Check if stopping rule is met
function shouldStop(
  questionsAnswered: number,
  ability: number,
  se: number,
  config: CATConfig
): { stop: boolean; reason: string } {
  if (questionsAnswered >= config.maxQuestions) {
    return { stop: true, reason: "Maximum questions reached" };
  }

  if (questionsAnswered < config.minQuestions) {
    return { stop: false, reason: "" };
  }

  switch (config.stoppingRule) {
    case "fixed":
      return { stop: questionsAnswered >= config.minQuestions, reason: "Fixed number reached" };

    case "precision":
      if (se <= config.targetSE) {
        return { stop: true, reason: "Target precision achieved" };
      }
      break;

    case "classification":
      // Check if we can confidently classify as pass/fail
      const ciLower = ability - 1.96 * se;
      const ciUpper = ability + 1.96 * se;

      if (ciLower > config.passingAbility) {
        return { stop: true, reason: "Clearly above passing" };
      }
      if (ciUpper < config.passingAbility) {
        return { stop: true, reason: "Clearly below passing" };
      }
      break;
  }

  return { stop: false, reason: "" };
}

// Main CAT hook
export function useAdaptiveTesting(config: Partial<CATConfig> = {}) {
  const [session, setSession] = useState<CATSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CATQuestion | null>(null);
  const [questionPool, setQuestionPool] = useState<CATQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  const catConfig = { ...DEFAULT_CONFIG, ...config };

  // Start a new CAT session
  const startSession = useCallback(async (
    categoryFilter?: string,
    certificationLevel?: string
  ): Promise<boolean> => {
    if (!profile?.id || !profile?.tenant_id) {
      toast.error("You must be logged in to start a test");
      return false;
    }

    try {
      setIsLoading(true);

      // Fetch question pool with IRT parameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("question_bank")
        .select(`
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          difficulty,
          discrimination_index,
          times_used,
          times_correct,
          category:question_bank_categories(name)
        `)
        .eq("is_active", true)
        .eq("is_validated", true);

      if (certificationLevel) {
        query = query.eq("certification_level", certificationLevel);
      }
      if (categoryFilter) {
        query = query.eq("category_id", categoryFilter);
      }

      const { data: questions, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!questions || questions.length < catConfig.minQuestions) {
        toast.error("Not enough validated questions for adaptive test");
        return false;
      }

      // Convert questions to CAT format with IRT parameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catQuestions: CATQuestion[] = questions.map((q: any) => {
        // Calculate IRT parameters from question stats
        const difficultyMap: Record<string, number> = {
          easy: -1,
          medium: 0,
          hard: 1,
          expert: 2,
        };

        const baseDifficulty = difficultyMap[q.difficulty] || 0;

        // Adjust difficulty based on historical performance
        let adjustedDifficulty = baseDifficulty;
        if (q.times_used > 10) {
          const correctRate = q.times_correct / q.times_used;
          // Higher correct rate = easier question
          adjustedDifficulty = baseDifficulty - (correctRate - 0.5) * 2;
        }

        // Use discrimination index if available
        const discrimination = q.discrimination_index
          ? Math.max(0.5, Math.min(2.5, q.discrimination_index * 2.5))
          : 1.0;

        // Guessing parameter based on question type
        const guessing = q.question_type === "multiple_choice"
          ? 1 / (q.options?.length || 4)
          : q.question_type === "true_false"
          ? 0.5
          : 0;

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          category: q.category?.name || "General",
          irt_parameters: {
            difficulty: Math.max(-3, Math.min(3, adjustedDifficulty)),
            discrimination,
            guessing,
          },
        };
      });

      setQuestionPool(catQuestions);

      // Create session
      const newSession: CATSession = {
        id: crypto.randomUUID(),
        tenant_id: profile.tenant_id,
        student_id: profile.id,
        assignment_id: null,
        status: "in_progress",
        current_ability: catConfig.initialAbility,
        ability_se: 1,
        questions_answered: 0,
        questions_correct: 0,
        response_history: [],
        started_at: new Date().toISOString(),
        completed_at: null,
        final_score: null,
        pass_fail: null,
      };

      setSession(newSession);

      // Select first question (near ability level)
      const firstQuestion = selectNextItem(catQuestions, catConfig.initialAbility, new Set());
      setCurrentQuestion(firstQuestion);

      return true;
    } catch (err) {
      console.error("Failed to start CAT session:", err);
      toast.error("Failed to start adaptive test");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, supabase, catConfig]);

  // Submit answer and get next question
  const submitAnswer = useCallback(async (
    answerId: string,
    timeSpent: number
  ): Promise<{ finished: boolean; passFail?: "pass" | "fail"; isCorrect?: boolean; correctAnswerId?: string }> => {
    if (!session || !currentQuestion) {
      return { finished: true };
    }

    // Check if answer is correct
    const correctAnswer = currentQuestion.correct_answer as { answerId?: string; text?: string };
    const isCorrect = correctAnswer.answerId === answerId;

    // Update response history
    const newResponse = {
      question_id: currentQuestion.id,
      response: answerId,
      correct: isCorrect,
      ability_after: session.current_ability,
      time_seconds: timeSpent,
    };

    // Recalculate ability estimate
    const allResponses = [...session.response_history, newResponse].map((r) => {
      const q = questionPool.find((q) => q.id === r.question_id);
      return {
        difficulty: q?.irt_parameters.difficulty || 0,
        discrimination: q?.irt_parameters.discrimination || 1,
        guessing: q?.irt_parameters.guessing || 0.25,
        correct: r.correct,
      };
    });

    const { ability, se } = estimateAbility(allResponses, catConfig.initialAbility);

    // Update session
    const updatedSession: CATSession = {
      ...session,
      current_ability: ability,
      ability_se: se,
      questions_answered: session.questions_answered + 1,
      questions_correct: session.questions_correct + (isCorrect ? 1 : 0),
      response_history: [...session.response_history, { ...newResponse, ability_after: ability }],
    };

    // Check stopping rule
    const { stop, reason: _reason } = shouldStop(
      updatedSession.questions_answered,
      ability,
      se,
      catConfig
    );

    if (stop) {
      // Determine pass/fail
      const passFail = ability >= catConfig.passingAbility ? "pass" : "fail";

      // Convert ability to score (scale 0-100)
      const scaledScore = Math.round(((ability + 3) / 6) * 100);

      const finalSession: CATSession = {
        ...updatedSession,
        status: "completed",
        completed_at: new Date().toISOString(),
        final_score: Math.max(0, Math.min(100, scaledScore)),
        pass_fail: passFail,
      };

      setSession(finalSession);
      setCurrentQuestion(null);

      // Save session to database
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("cat_sessions")
          .insert({
            id: finalSession.id,
            tenant_id: finalSession.tenant_id,
            student_id: finalSession.student_id,
            status: finalSession.status,
            final_ability: ability,
            ability_se: se,
            questions_answered: finalSession.questions_answered,
            questions_correct: finalSession.questions_correct,
            final_score: finalSession.final_score,
            pass_fail: passFail,
            response_history: finalSession.response_history,
            started_at: finalSession.started_at,
            completed_at: finalSession.completed_at,
          });
      } catch (err) {
        console.error("Failed to save CAT session:", err);
      }

      return { finished: true, passFail, isCorrect, correctAnswerId: correctAnswer.answerId };
    }

    setSession(updatedSession);

    // Select next question
    const answeredIds = new Set(updatedSession.response_history.map((r) => r.question_id));
    const nextQuestion = selectNextItem(questionPool, ability, answeredIds);

    if (!nextQuestion) {
      // No more questions available
      const passFail = ability >= catConfig.passingAbility ? "pass" : "fail";
      setSession({
        ...updatedSession,
        status: "completed",
        pass_fail: passFail,
      });
      setCurrentQuestion(null);
      return { finished: true, passFail, isCorrect, correctAnswerId: correctAnswer.answerId };
    }

    setCurrentQuestion(nextQuestion);
    return { finished: false, isCorrect, correctAnswerId: correctAnswer.answerId };
  }, [session, currentQuestion, questionPool, catConfig, supabase]);

  // Abandon session
  const abandonSession = useCallback(async () => {
    if (!session) return;

    const abandonedSession: CATSession = {
      ...session,
      status: "abandoned",
      completed_at: new Date().toISOString(),
    };

    setSession(abandonedSession);
    setCurrentQuestion(null);
  }, [session]);

  // Get current progress
  const getProgress = useCallback(() => {
    if (!session) return null;

    return {
      questionsAnswered: session.questions_answered,
      questionsCorrect: session.questions_correct,
      accuracy: session.questions_answered > 0
        ? (session.questions_correct / session.questions_answered) * 100
        : 0,
      currentAbility: session.current_ability,
      abilityCI: [
        session.current_ability - 1.96 * session.ability_se,
        session.current_ability + 1.96 * session.ability_se,
      ],
      estimatedProgress: Math.min(
        100,
        (session.questions_answered / catConfig.maxQuestions) * 100
      ),
    };
  }, [session, catConfig]);

  // Return a sanitized question that does not expose correct_answer or isCorrect
  const safeQuestion = currentQuestion
    ? {
        ...currentQuestion,
        correct_answer: undefined,
        options: currentQuestion.options?.map(({ isCorrect: _isCorrect, ...opt }) => opt),
      }
    : null;

  return {
    session,
    currentQuestion: safeQuestion,
    isLoading,
    startSession,
    submitAnswer,
    abandonSession,
    getProgress,
    config: catConfig,
  };
}

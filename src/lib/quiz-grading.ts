/**
 * Quiz auto-grading.
 *
 * Extracted from the student assignment page so the rules are testable and so
 * the same comparison is used everywhere a quiz is scored.
 *
 * Short answers are never marked wrong automatically. An answer that matches
 * the expected text is credited outright; anything else is left pending for an
 * instructor, because the expected answers real programs write are not things a
 * student reproduces verbatim — one of these quizzes expects "Right Patient,
 * Right Medication, Right Dose, Right Route, Right Time, Right Documentation",
 * and string equality would score every honest attempt at that as zero.
 */

export type GradableQuestionType =
  | "multiple_choice"
  | "true_false"
  | "matching"
  | "short_answer"
  | null;

export interface GradableQuestion {
  id: string;
  question_type: GradableQuestionType;
  points: number | null;
}

export interface QuizGradeResult {
  /** Points earned on questions the system scored by itself. */
  score: number;
  /** Points across every question on the quiz, pending ones included. */
  totalPoints: number;
  /** Points tied up in questions an instructor has still to mark. */
  pendingPoints: number;
  /** Questions awaiting an instructor, in quiz order. */
  pendingQuestionIds: string[];
}

/** Points an instructor awarded, keyed by question id. */
export type QuestionGrades = Record<string, number>;

/**
 * `correct_answer` is a jsonb column: an option index for multiple choice and
 * true/false, or the expected text for short answer. Legacy rows store the
 * text unquoted, which is not valid JSON — JSON.parse throws on it, which
 * previously took the whole submission down. Fall back to the raw string.
 */
export function safeParseAnswer(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Short answers are compared case-insensitively, ignoring surrounding space. */
export function normalizeShortAnswer(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Does this short answer match the expected text closely enough to credit
 * without asking anyone? Only an exact match after trimming and case folding.
 * Deliberately strict: a false positive here silently hands out marks nobody
 * checked, whereas a false negative only routes the answer to the instructor,
 * which is where it was going anyway.
 */
export function shortAnswerMatches(given: unknown, expected: unknown): boolean {
  const g = normalizeShortAnswer(given);
  return g !== "" && g === normalizeShortAnswer(expected);
}

export function gradeQuizAnswers(
  questions: GradableQuestion[],
  answers: Record<string, number | string>,
  correctAnswers: Map<string, unknown>
): QuizGradeResult {
  let score = 0;
  let totalPoints = 0;
  let pendingPoints = 0;
  const pendingQuestionIds: string[] = [];

  for (const question of questions) {
    const questionPoints = question.points ?? 1;
    totalPoints += questionPoints;

    const userAnswer = answers[question.id];
    const correctAnswer = correctAnswers.get(question.id);

    if (question.question_type === "short_answer") {
      // An unanswered short answer is still the instructor's call — a blank may
      // be worth partial credit on a multi-part question, and it is not this
      // code's place to decide that.
      if (shortAnswerMatches(userAnswer, correctAnswer)) {
        score += questionPoints;
      } else {
        pendingPoints += questionPoints;
        pendingQuestionIds.push(question.id);
      }
      continue;
    }

    if (correctAnswer === undefined || userAnswer === undefined) continue;

    if (userAnswer === correctAnswer) {
      score += questionPoints;
    }
  }

  return { score, totalPoints, pendingPoints, pendingQuestionIds };
}

/**
 * Fold an instructor's per-question awards into the auto-graded score.
 *
 * Awards are clamped to the question's own points so a slip in the grading form
 * cannot put a student above the maximum, and unknown question ids are ignored
 * rather than added blindly.
 */
export function finalizeQuizScore(
  autoScore: number,
  questionGrades: QuestionGrades,
  questions: GradableQuestion[]
): { score: number; totalPoints: number } {
  const byId = new Map(questions.map((q) => [q.id, q.points ?? 1]));
  let score = autoScore;

  for (const [questionId, awarded] of Object.entries(questionGrades)) {
    const max = byId.get(questionId);
    if (max === undefined) continue;
    if (!Number.isFinite(awarded)) continue;
    score += Math.min(Math.max(awarded, 0), max);
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
  return { score, totalPoints };
}

/** Whole-number percentage, guarding the zero-question quiz. */
export function toPercentage(score: number, totalPoints: number): number {
  if (totalPoints <= 0) return 0;
  return Math.round((score / totalPoints) * 100);
}

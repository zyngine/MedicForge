/**
 * Quiz auto-grading.
 *
 * Extracted from the student assignment page so the rules are testable and so
 * the same comparison is used everywhere a quiz is scored.
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

export function gradeQuizAnswers(
  questions: GradableQuestion[],
  answers: Record<string, number | string>,
  correctAnswers: Map<string, unknown>
): { score: number; totalPoints: number } {
  let score = 0;
  let totalPoints = 0;

  for (const question of questions) {
    const questionPoints = question.points ?? 1;
    totalPoints += questionPoints;

    const userAnswer = answers[question.id];
    const correctAnswer = correctAnswers.get(question.id);

    if (correctAnswer === undefined || userAnswer === undefined) continue;

    if (question.question_type === "short_answer") {
      // The builder tells instructors answers are compared case-insensitively,
      // so compare that way. A strict === against a numeric correct_answer
      // meant short answers were never credited at all.
      const given = normalizeShortAnswer(userAnswer);
      if (given !== "" && given === normalizeShortAnswer(correctAnswer)) {
        score += questionPoints;
      }
      continue;
    }

    if (userAnswer === correctAnswer) {
      score += questionPoints;
    }
  }

  return { score, totalPoints };
}

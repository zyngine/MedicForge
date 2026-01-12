/**
 * Grade Curving Utilities for MedicForge
 *
 * Implements various curve methods to adjust student grades:
 * - Bell Curve: Shift scores so mean equals target
 * - Square Root Curve: sqrt(score/max) * max
 * - Linear Curve: Highest score becomes 100%
 * - Flat Curve: Add fixed bonus points to all
 */

export type CurveMethod = "none" | "bell" | "sqrt" | "linear" | "flat";

export interface ScoreInput {
  submissionId: string;
  studentId: string;
  rawScore: number;
}

export interface CurvedScore {
  submissionId: string;
  studentId: string;
  rawScore: number;
  curvedScore: number;
  adjustment: number;
  percentile: number;
}

export interface CurveConfig {
  method: CurveMethod;
  maxPoints: number;
  targetMean?: number; // For bell curve (0-100)
  bonusPoints?: number; // For flat curve
}

export interface CurveResult {
  scores: CurvedScore[];
  stats: {
    originalMean: number;
    newMean: number;
    originalMedian: number;
    newMedian: number;
    studentsAffected: number;
    totalStudents: number;
  };
}

/**
 * Calculate percentile rank for a score
 */
function calculatePercentile(score: number, allScores: number[]): number {
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / allScores.length) * 100);
}

/**
 * Calculate mean of an array of numbers
 */
function calculateMean(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Bell Curve: Shift all scores so the mean equals the target mean
 * Example: If current mean is 70% and target is 80%, add 10 points to everyone
 */
export function bellCurve(
  scores: ScoreInput[],
  maxPoints: number,
  targetMean: number
): CurvedScore[] {
  if (scores.length === 0) return [];

  const rawScores = scores.map((s) => s.rawScore);
  const currentMean = calculateMean(rawScores);
  const targetScore = (targetMean / 100) * maxPoints;
  const adjustment = targetScore - currentMean;

  return scores.map((s) => {
    const curvedScore = Math.min(maxPoints, Math.max(0, s.rawScore + adjustment));
    return {
      submissionId: s.submissionId,
      studentId: s.studentId,
      rawScore: s.rawScore,
      curvedScore: Math.round(curvedScore * 100) / 100,
      adjustment: Math.round(adjustment * 100) / 100,
      percentile: calculatePercentile(s.rawScore, rawScores),
    };
  });
}

/**
 * Square Root Curve: newScore = sqrt(rawScore/maxPoints) * maxPoints
 * This helps lower scores more than higher scores
 * Example: 64/100 becomes sqrt(0.64) * 100 = 80
 */
export function sqrtCurve(
  scores: ScoreInput[],
  maxPoints: number
): CurvedScore[] {
  if (scores.length === 0) return [];

  const rawScores = scores.map((s) => s.rawScore);

  return scores.map((s) => {
    const normalizedScore = s.rawScore / maxPoints;
    const curvedScore = Math.sqrt(normalizedScore) * maxPoints;
    return {
      submissionId: s.submissionId,
      studentId: s.studentId,
      rawScore: s.rawScore,
      curvedScore: Math.round(curvedScore * 100) / 100,
      adjustment: Math.round((curvedScore - s.rawScore) * 100) / 100,
      percentile: calculatePercentile(s.rawScore, rawScores),
    };
  });
}

/**
 * Linear Curve: Scale all scores so the highest score becomes 100%
 * Example: If highest is 90/100, multiply all by 100/90
 */
export function linearCurve(
  scores: ScoreInput[],
  maxPoints: number
): CurvedScore[] {
  if (scores.length === 0) return [];

  const rawScores = scores.map((s) => s.rawScore);
  const highest = Math.max(...rawScores);

  if (highest === 0) {
    return scores.map((s) => ({
      submissionId: s.submissionId,
      studentId: s.studentId,
      rawScore: s.rawScore,
      curvedScore: 0,
      adjustment: 0,
      percentile: 0,
    }));
  }

  const multiplier = maxPoints / highest;

  return scores.map((s) => {
    const curvedScore = s.rawScore * multiplier;
    return {
      submissionId: s.submissionId,
      studentId: s.studentId,
      rawScore: s.rawScore,
      curvedScore: Math.round(curvedScore * 100) / 100,
      adjustment: Math.round((curvedScore - s.rawScore) * 100) / 100,
      percentile: calculatePercentile(s.rawScore, rawScores),
    };
  });
}

/**
 * Flat Curve: Add fixed bonus points to all scores
 * Scores are capped at maxPoints
 */
export function flatCurve(
  scores: ScoreInput[],
  maxPoints: number,
  bonusPoints: number
): CurvedScore[] {
  if (scores.length === 0) return [];

  const rawScores = scores.map((s) => s.rawScore);

  return scores.map((s) => {
    const curvedScore = Math.min(maxPoints, s.rawScore + bonusPoints);
    return {
      submissionId: s.submissionId,
      studentId: s.studentId,
      rawScore: s.rawScore,
      curvedScore: Math.round(curvedScore * 100) / 100,
      adjustment: Math.round((curvedScore - s.rawScore) * 100) / 100,
      percentile: calculatePercentile(s.rawScore, rawScores),
    };
  });
}

/**
 * Main function to apply any curve method
 */
export function applyCurve(
  scores: ScoreInput[],
  config: CurveConfig
): CurveResult {
  if (scores.length === 0) {
    return {
      scores: [],
      stats: {
        originalMean: 0,
        newMean: 0,
        originalMedian: 0,
        newMedian: 0,
        studentsAffected: 0,
        totalStudents: 0,
      },
    };
  }

  let curvedScores: CurvedScore[];

  switch (config.method) {
    case "bell":
      curvedScores = bellCurve(scores, config.maxPoints, config.targetMean || 80);
      break;
    case "sqrt":
      curvedScores = sqrtCurve(scores, config.maxPoints);
      break;
    case "linear":
      curvedScores = linearCurve(scores, config.maxPoints);
      break;
    case "flat":
      curvedScores = flatCurve(scores, config.maxPoints, config.bonusPoints || 5);
      break;
    case "none":
    default:
      curvedScores = scores.map((s) => ({
        submissionId: s.submissionId,
        studentId: s.studentId,
        rawScore: s.rawScore,
        curvedScore: s.rawScore,
        adjustment: 0,
        percentile: calculatePercentile(
          s.rawScore,
          scores.map((x) => x.rawScore)
        ),
      }));
  }

  const rawScores = scores.map((s) => s.rawScore);
  const newScores = curvedScores.map((s) => s.curvedScore);
  const studentsAffected = curvedScores.filter(
    (s) => s.curvedScore !== s.rawScore
  ).length;

  return {
    scores: curvedScores,
    stats: {
      originalMean: Math.round(calculateMean(rawScores) * 100) / 100,
      newMean: Math.round(calculateMean(newScores) * 100) / 100,
      originalMedian: Math.round(calculateMedian(rawScores) * 100) / 100,
      newMedian: Math.round(calculateMedian(newScores) * 100) / 100,
      studentsAffected,
      totalStudents: scores.length,
    },
  };
}

/**
 * Preview curve without applying - useful for showing impact before committing
 */
export function previewCurve(
  scores: ScoreInput[],
  config: CurveConfig
): CurveResult {
  return applyCurve(scores, config);
}

/**
 * Convert percentage to letter grade
 */
export function percentageToLetterGrade(percentage: number): string {
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

/**
 * Calculate GPA points from letter grade
 */
export function letterGradeToGPA(letterGrade: string): number {
  const gpaMap: Record<string, number> = {
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "C-": 1.7,
    "D+": 1.3,
    "D": 1.0,
    "D-": 0.7,
    "F": 0.0,
  };
  return gpaMap[letterGrade] ?? 0.0;
}

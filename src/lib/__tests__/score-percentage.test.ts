import { describe, it, expect } from "vitest";
import {
  scorePercentage,
  scorePercentageRounded,
  averageScorePercentage,
  weightedScorePercentage,
  formatScorePercentage,
} from "../grading";

describe("scorePercentage", () => {
  it("converts points to a percentage", () => {
    expect(scorePercentage(7, 14)).toBe(50);
    expect(scorePercentage(39, 60)).toBe(65);
  });

  it("returns null, not 0, when there is no score", () => {
    // 0 would read as a score of zero and drag averages down; the truth is
    // that there is no score to report.
    expect(scorePercentage(null, 14)).toBeNull();
    expect(scorePercentage(undefined, 14)).toBeNull();
  });

  it("returns null when the assignment is worth nothing", () => {
    expect(scorePercentage(7, 0)).toBeNull();
    expect(scorePercentage(7, null)).toBeNull();
  });

  it("keeps a genuine zero score", () => {
    expect(scorePercentage(0, 14)).toBe(0);
  });

  it("does not cap above 100 — extra credit is a real score", () => {
    expect(scorePercentage(15, 14)).toBeCloseTo(107.14, 1);
  });
});

describe("scorePercentageRounded", () => {
  it("rounds to a whole percent", () => {
    expect(scorePercentageRounded(1, 7)).toBe(14);
    expect(scorePercentageRounded(2, 7)).toBe(29);
  });

  it("passes null through", () => {
    expect(scorePercentageRounded(null, 7)).toBeNull();
  });
});

describe("averageScorePercentage", () => {
  it("averages percentages, not raw points", () => {
    // This is the bug it exists to prevent: averaging the points would give
    // (95 + 7) / 2 = 51, which is neither a score nor a percentage.
    const result = averageScorePercentage([
      { score: 95, pointsPossible: 125 }, // 76%
      { score: 7, pointsPossible: 14 }, //  50%
    ]);
    expect(result).toBeCloseTo(63, 0);
  });

  it("weights every assignment equally regardless of size", () => {
    const result = averageScorePercentage([
      { score: 100, pointsPossible: 100 },
      { score: 0, pointsPossible: 10 },
    ]);
    expect(result).toBe(50);
  });

  it("leaves ungraded submissions out rather than counting them as zero", () => {
    const result = averageScorePercentage([
      { score: 10, pointsPossible: 10 },
      { score: null, pointsPossible: 10 },
    ]);
    expect(result).toBe(100);
  });

  it("returns null when nothing is graded", () => {
    expect(averageScorePercentage([{ score: null, pointsPossible: 10 }])).toBeNull();
    expect(averageScorePercentage([])).toBeNull();
  });
});

describe("weightedScorePercentage", () => {
  it("weights by what each assignment is worth", () => {
    // 100 of 110 points earned overall, not the 50% a flat average would give.
    const result = weightedScorePercentage([
      { score: 100, pointsPossible: 100 },
      { score: 0, pointsPossible: 10 },
    ]);
    expect(result).toBeCloseTo(90.9, 1);
  });

  it("skips ungraded submissions on both sides of the ratio", () => {
    // The ungraded 50-point assignment must not count against the student.
    const result = weightedScorePercentage([
      { score: 10, pointsPossible: 10 },
      { score: null, pointsPossible: 50 },
    ]);
    expect(result).toBe(100);
  });

  it("returns null when nothing is graded", () => {
    expect(weightedScorePercentage([])).toBeNull();
  });
});

describe("formatScorePercentage", () => {
  it("formats for display", () => {
    expect(formatScorePercentage(7, 14)).toBe("50%");
  });

  it("shows a dash rather than 0% when there is no score", () => {
    expect(formatScorePercentage(null, 14)).toBe("—");
  });
});

import { describe, it, expect } from "vitest";
import {
  gradeQuizAnswers,
  normalizeShortAnswer,
  safeParseAnswer,
  shortAnswerMatches,
  finalizeQuizScore,
  toPercentage,
} from "../quiz-grading";

describe("safeParseAnswer", () => {
  it("parses a JSON-encoded option index", () => {
    expect(safeParseAnswer("2")).toBe(2);
  });

  it("parses a JSON-encoded string", () => {
    expect(safeParseAnswer('"epinephrine"')).toBe("epinephrine");
  });

  it("falls back to the raw string for unquoted legacy text", () => {
    // Short-answer keys were stored unquoted, which JSON.parse throws on —
    // that used to take the whole submission down.
    expect(safeParseAnswer("epinephrine")).toBe("epinephrine");
  });
});

describe("normalizeShortAnswer", () => {
  it("trims and lowercases", () => {
    expect(normalizeShortAnswer("  Epinephrine ")).toBe("epinephrine");
  });

  it("treats null and undefined as empty", () => {
    expect(normalizeShortAnswer(null)).toBe("");
    expect(normalizeShortAnswer(undefined)).toBe("");
  });
});

describe("gradeQuizAnswers", () => {
  const mc = {
    id: "q1",
    question_type: "multiple_choice" as const,
    points: 2,
  };
  const tf = { id: "q2", question_type: "true_false" as const, points: 1 };
  const sa = { id: "q3", question_type: "short_answer" as const, points: 3 };

  it("credits a correct multiple choice answer by index", () => {
    const result = gradeQuizAnswers([mc], { q1: 1 }, new Map([["q1", 1]]));
    expect(result).toEqual({
      score: 2,
      totalPoints: 2,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("does not credit a wrong multiple choice answer", () => {
    const result = gradeQuizAnswers([mc], { q1: 0 }, new Map([["q1", 1]]));
    expect(result).toEqual({
      score: 0,
      totalPoints: 2,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("credits short answer case-insensitively and ignoring whitespace", () => {
    const result = gradeQuizAnswers(
      [sa],
      { q3: "  EPINEPHRINE " },
      new Map([["q3", "epinephrine"]])
    );
    expect(result).toEqual({
      score: 3,
      totalPoints: 3,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("sends a blank short answer to the instructor rather than scoring it zero", () => {
    const result = gradeQuizAnswers([sa], { q3: "   " }, new Map([["q3", ""]]));
    expect(result).toEqual({
      score: 0,
      totalPoints: 3,
      pendingPoints: 3,
      pendingQuestionIds: ["q3"],
    });
  });

  it("sends a non-matching short answer to the instructor rather than marking it wrong", () => {
    // This is the behaviour the medication quizzes need: an expected answer of
    // "Right Patient, Right Medication, ..." is not something a student types
    // verbatim, and scoring it zero automatically is the wrong answer.
    const result = gradeQuizAnswers(
      [sa],
      { q3: "atropine" },
      new Map([["q3", "epinephrine"]])
    );
    expect(result).toEqual({
      score: 0,
      totalPoints: 3,
      pendingPoints: 3,
      pendingQuestionIds: ["q3"],
    });
  });

  it("credits a short answer whose key was saved as a number by the old builder", () => {
    // The Short Answer quick-add button used to seed correct_answer: 0, so
    // existing questions can have a numeric key. A student typing "0" matches;
    // anything else does not, and neither should crash.
    const result = gradeQuizAnswers([sa], { q3: "0" }, new Map([["q3", 0]]));
    expect(result).toEqual({
      score: 3,
      totalPoints: 3,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("counts points for unanswered questions but awards none", () => {
    const result = gradeQuizAnswers([mc, sa], {}, new Map<string, unknown>([["q1", 1], ["q3", "x"]]));
    // The unanswered multiple choice scores zero outright; the unanswered short
    // answer is the instructor's to judge.
    expect(result).toEqual({
      score: 0,
      totalPoints: 5,
      pendingPoints: 3,
      pendingQuestionIds: ["q3"],
    });
  });

  it("grades a mixed quiz", () => {
    const result = gradeQuizAnswers(
      [mc, tf, sa],
      { q1: 1, q2: 0, q3: "Epinephrine" },
      new Map<string, unknown>([
        ["q1", 1],
        ["q2", 1],
        ["q3", "epinephrine"],
      ])
    );
    // mc correct (2) + tf wrong (0) + sa matches exactly (3)
    expect(result).toEqual({
      score: 5,
      totalPoints: 6,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("defaults missing points to 1", () => {
    const result = gradeQuizAnswers(
      [{ id: "q9", question_type: "multiple_choice", points: null }],
      { q9: 0 },
      new Map([["q9", 0]])
    );
    expect(result).toEqual({
      score: 1,
      totalPoints: 1,
      pendingPoints: 0,
      pendingQuestionIds: [],
    });
  });

  it("lists pending questions in quiz order", () => {
    const sa2 = { id: "q4", question_type: "short_answer" as const, points: 1 };
    const result = gradeQuizAnswers(
      [sa, mc, sa2],
      { q3: "wrong", q1: 1, q4: "also wrong" },
      new Map<string, unknown>([["q3", "a"], ["q1", 1], ["q4", "b"]])
    );
    expect(result.pendingQuestionIds).toEqual(["q3", "q4"]);
    expect(result.score).toBe(2);
    expect(result.pendingPoints).toBe(4);
  });
});

describe("shortAnswerMatches", () => {
  it("matches after trimming and case folding", () => {
    expect(shortAnswerMatches("  EPINEPHRINE ", "epinephrine")).toBe(true);
  });

  it("does not match a blank answer, even against a blank expectation", () => {
    expect(shortAnswerMatches("   ", "")).toBe(false);
  });

  it("does not match different text", () => {
    expect(shortAnswerMatches("atropine", "epinephrine")).toBe(false);
  });
});

describe("finalizeQuizScore", () => {
  const mc = { id: "q1", question_type: "multiple_choice" as const, points: 2 };
  const sa = { id: "q3", question_type: "short_answer" as const, points: 3 };

  it("adds the instructor's awards to the auto-graded score", () => {
    expect(finalizeQuizScore(2, { q3: 3 }, [mc, sa])).toEqual({
      score: 5,
      totalPoints: 5,
    });
  });

  it("awards partial credit", () => {
    expect(finalizeQuizScore(2, { q3: 1.5 }, [mc, sa])).toEqual({
      score: 3.5,
      totalPoints: 5,
    });
  });

  it("clamps an award to the question's own points", () => {
    // A slip in the grading form must not put a student above the maximum.
    expect(finalizeQuizScore(2, { q3: 99 }, [mc, sa]).score).toBe(5);
  });

  it("clamps a negative award to zero", () => {
    expect(finalizeQuizScore(2, { q3: -5 }, [mc, sa]).score).toBe(2);
  });

  it("ignores an award for a question that is not on the quiz", () => {
    expect(finalizeQuizScore(2, { nope: 10 }, [mc, sa]).score).toBe(2);
  });

  it("ignores a non-numeric award rather than producing NaN", () => {
    expect(finalizeQuizScore(2, { q3: Number.NaN }, [mc, sa]).score).toBe(2);
  });
});

describe("toPercentage", () => {
  it("rounds to a whole percent", () => {
    expect(toPercentage(5, 6)).toBe(83);
  });

  it("returns 0 for a quiz worth no points rather than dividing by zero", () => {
    expect(toPercentage(0, 0)).toBe(0);
  });
});

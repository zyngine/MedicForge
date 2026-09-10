import { describe, it, expect } from "vitest";
import {
  gradeQuizAnswers,
  normalizeShortAnswer,
  safeParseAnswer,
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
    expect(result).toEqual({ score: 2, totalPoints: 2 });
  });

  it("does not credit a wrong multiple choice answer", () => {
    const result = gradeQuizAnswers([mc], { q1: 0 }, new Map([["q1", 1]]));
    expect(result).toEqual({ score: 0, totalPoints: 2 });
  });

  it("credits short answer case-insensitively and ignoring whitespace", () => {
    const result = gradeQuizAnswers(
      [sa],
      { q3: "  EPINEPHRINE " },
      new Map([["q3", "epinephrine"]])
    );
    expect(result).toEqual({ score: 3, totalPoints: 3 });
  });

  it("does not credit a blank short answer even against a blank key", () => {
    const result = gradeQuizAnswers([sa], { q3: "   " }, new Map([["q3", ""]]));
    expect(result).toEqual({ score: 0, totalPoints: 3 });
  });

  it("does not credit a wrong short answer", () => {
    const result = gradeQuizAnswers(
      [sa],
      { q3: "atropine" },
      new Map([["q3", "epinephrine"]])
    );
    expect(result).toEqual({ score: 0, totalPoints: 3 });
  });

  it("credits a short answer whose key was saved as a number by the old builder", () => {
    // The Short Answer quick-add button used to seed correct_answer: 0, so
    // existing questions can have a numeric key. A student typing "0" matches;
    // anything else does not, and neither should crash.
    const result = gradeQuizAnswers([sa], { q3: "0" }, new Map([["q3", 0]]));
    expect(result).toEqual({ score: 3, totalPoints: 3 });
  });

  it("counts points for unanswered questions but awards none", () => {
    const result = gradeQuizAnswers([mc, sa], {}, new Map<string, unknown>([["q1", 1], ["q3", "x"]]));
    expect(result).toEqual({ score: 0, totalPoints: 5 });
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
    // mc correct (2) + tf wrong (0) + sa correct (3)
    expect(result).toEqual({ score: 5, totalPoints: 6 });
  });

  it("defaults missing points to 1", () => {
    const result = gradeQuizAnswers(
      [{ id: "q9", question_type: "multiple_choice", points: null }],
      { q9: 0 },
      new Map([["q9", 0]])
    );
    expect(result).toEqual({ score: 1, totalPoints: 1 });
  });
});

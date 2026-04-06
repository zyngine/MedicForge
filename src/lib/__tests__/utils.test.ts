import { describe, it, expect } from "vitest";
import {
  slugify,
  truncate,
  calculatePercentage,
  formatPercentage,
  formatPoints,
  getGradeColor,
  getLetterGrade,
  formatFileSize,
  formatDuration,
  isValidEmail,
  groupBy,
  generateEnrollmentCode,
} from "@/lib/utils";

describe("slugify", () => {
  it("converts text to a URL-friendly slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple spaces/dashes", () => {
    expect(slugify("hello   world--foo")).toBe("hello-world-foo");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });
});

describe("truncate", () => {
  it("returns full text when shorter than limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis when text exceeds limit", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("returns full text when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("calculatePercentage", () => {
  it("calculates correct percentage", () => {
    expect(calculatePercentage(75, 100)).toBe(75);
  });

  it("rounds to nearest integer", () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it("returns 0 when total is 0", () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });
});

describe("formatPercentage", () => {
  it("formats a number as a percentage string", () => {
    expect(formatPercentage(85.7)).toBe("86%");
  });
});

describe("formatPoints", () => {
  it("formats points as fraction string", () => {
    expect(formatPoints(8, 10)).toBe("8/10");
  });
});

describe("getGradeColor", () => {
  it("returns success color for 90+", () => {
    expect(getGradeColor(95)).toBe("text-success");
  });

  it("returns info color for 80-89", () => {
    expect(getGradeColor(85)).toBe("text-info");
  });

  it("returns warning color for 70-79", () => {
    expect(getGradeColor(75)).toBe("text-warning");
  });

  it("returns error color for below 70", () => {
    expect(getGradeColor(60)).toBe("text-error");
  });
});

describe("getLetterGrade", () => {
  it("returns A for 93+", () => {
    expect(getLetterGrade(95)).toBe("A");
  });

  it("returns B for 83-86", () => {
    expect(getLetterGrade(85)).toBe("B");
  });

  it("returns C for 73-76", () => {
    expect(getLetterGrade(75)).toBe("C");
  });

  it("returns F for below 60", () => {
    expect(getLetterGrade(50)).toBe("F");
  });
});

describe("formatFileSize", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3660)).toBe("1h 1m");
  });

  it("formats exact minutes without trailing seconds", () => {
    expect(formatDuration(120)).toBe("2m");
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects emails without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects emails without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });
});

describe("groupBy", () => {
  it("groups array items by the specified key", () => {
    const items = [
      { type: "a", value: 1 },
      { type: "b", value: 2 },
      { type: "a", value: 3 },
    ];
    const result = groupBy(items, "type");
    expect(result).toEqual({
      a: [
        { type: "a", value: 1 },
        { type: "a", value: 3 },
      ],
      b: [{ type: "b", value: 2 }],
    });
  });
});

describe("generateEnrollmentCode", () => {
  it("returns a 6-character string", () => {
    const code = generateEnrollmentCode();
    expect(code).toHaveLength(6);
  });

  it("contains only allowed characters", () => {
    const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    const code = generateEnrollmentCode();
    expect(code).toMatch(allowed);
  });
});

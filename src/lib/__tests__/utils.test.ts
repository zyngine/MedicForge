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
  localDateString,
  localTimeString,
  addDaysLocal,
  startOfWeekLocal,
  addCalendarMonths,
  dateInTimeZone,
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

describe("localDateString / localTimeString", () => {
  it("uses the local calendar date, not the UTC one", () => {
    // 2026-09-16 21:30 local. toISOString() would report 2026-09-17 for any
    // timezone behind UTC, which is the bug these helpers exist to avoid.
    const evening = new Date(2026, 8, 16, 21, 30, 0);
    expect(localDateString(evening)).toBe("2026-09-16");
    expect(localTimeString(evening)).toBe("21:30");
  });

  it("zero-pads months, days, hours and minutes", () => {
    const d = new Date(2026, 0, 5, 9, 7, 0);
    expect(localDateString(d)).toBe("2026-01-05");
    expect(localTimeString(d)).toBe("09:07");
  });

  it("reports midnight as the new day, not the previous one", () => {
    const midnight = new Date(2026, 8, 17, 0, 5, 0);
    expect(localDateString(midnight)).toBe("2026-09-17");
    expect(localTimeString(midnight)).toBe("00:05");
  });
});

describe("addDaysLocal", () => {
  it("steps forward and back on the local calendar", () => {
    const base = new Date(2026, 8, 16, 21, 30);
    expect(addDaysLocal(1, base)).toBe("2026-09-17");
    expect(addDaysLocal(-1, base)).toBe("2026-09-15");
    expect(addDaysLocal(0, base)).toBe("2026-09-16");
  });

  it("crosses month and year boundaries", () => {
    expect(addDaysLocal(1, new Date(2026, 8, 30, 23, 59))).toBe("2026-10-01");
    expect(addDaysLocal(1, new Date(2026, 11, 31, 23, 59))).toBe("2027-01-01");
    expect(addDaysLocal(-1, new Date(2026, 0, 1, 0, 1))).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDaysLocal(1, new Date(2028, 1, 28))).toBe("2028-02-29");
    expect(addDaysLocal(1, new Date(2028, 1, 29))).toBe("2028-03-01");
  });

  it("counts whole days across a DST change, not 24-hour blocks", () => {
    // US DST springs forward on 2026-03-08. Adding milliseconds would land on
    // the wrong calendar day for a late-evening start; calendar arithmetic does
    // not. (In a UTC test runner there is no shift, so this asserts the
    // calendar-stepping behaviour holds either way.)
    expect(addDaysLocal(1, new Date(2026, 2, 7, 23, 0))).toBe("2026-03-08");
    expect(addDaysLocal(2, new Date(2026, 2, 7, 23, 0))).toBe("2026-03-09");
  });
});

describe("startOfWeekLocal", () => {
  it("returns the Sunday of the current week by default", () => {
    // 2026-09-16 is a Wednesday; the Sunday before is the 13th.
    expect(startOfWeekLocal(new Date(2026, 8, 16, 21, 30))).toBe("2026-09-13");
  });

  it("returns the same day when already on the boundary", () => {
    expect(startOfWeekLocal(new Date(2026, 8, 13, 23, 59))).toBe("2026-09-13");
  });

  it("does not roll into next week late on a Saturday evening", () => {
    // The old code kept the current time and then went through UTC, which
    // pushed a Saturday evening onto the following week.
    expect(startOfWeekLocal(new Date(2026, 8, 19, 22, 0))).toBe("2026-09-13");
  });

  it("supports a Monday week start", () => {
    expect(startOfWeekLocal(new Date(2026, 8, 16, 12, 0), 1)).toBe("2026-09-14");
    expect(startOfWeekLocal(new Date(2026, 8, 13, 12, 0), 1)).toBe("2026-09-07");
  });
});

describe("addCalendarMonths", () => {
  it("adds whole calendar months, not 30-day blocks", () => {
    // 24 months of 30 days is 720 days — nearly two weeks short of two years.
    expect(addCalendarMonths(24, new Date(2026, 8, 16))).toBe("2028-09-16");
    expect(addCalendarMonths(12, new Date(2026, 8, 16))).toBe("2027-09-16");
    expect(addCalendarMonths(1, new Date(2026, 8, 16))).toBe("2026-10-16");
  });

  it("clamps a day that does not exist in the target month", () => {
    expect(addCalendarMonths(1, new Date(2026, 0, 31))).toBe("2026-02-28");
    expect(addCalendarMonths(1, new Date(2028, 0, 31))).toBe("2028-02-29");
    expect(addCalendarMonths(1, new Date(2026, 4, 31))).toBe("2026-06-30");
  });

  it("handles zero and crossing a year", () => {
    expect(addCalendarMonths(0, new Date(2026, 8, 16))).toBe("2026-09-16");
    expect(addCalendarMonths(4, new Date(2026, 10, 30))).toBe("2027-03-30");
  });
});

describe("dateInTimeZone", () => {
  it("gives a different calendar date per zone for the same instant", () => {
    // 2026-10-08T01:30Z is Thursday in UTC but still Wednesday in the Americas.
    const instant = new Date("2026-10-08T01:30:00Z");
    expect(dateInTimeZone(instant, "UTC")).toBe("2026-10-08");
    expect(dateInTimeZone(instant, "America/Chicago")).toBe("2026-10-07");
    expect(dateInTimeZone(instant, "America/New_York")).toBe("2026-10-07");
    expect(dateInTimeZone(instant, "America/Los_Angeles")).toBe("2026-10-07");
  });

  it("zero-pads single-digit months and days", () => {
    expect(dateInTimeZone(new Date("2026-01-05T12:00:00Z"), "UTC")).toBe("2026-01-05");
  });

  it("handles a zone ahead of UTC", () => {
    expect(dateInTimeZone(new Date("2026-10-07T23:30:00Z"), "Asia/Tokyo")).toBe("2026-10-08");
  });
});

import { describe, it, expect } from "vitest";
import { parseClassDates } from "../class-dates";

describe("parseClassDates", () => {
  it("reads one ISO date per line", () => {
    const { dates, invalid } = parseClassDates("2026-11-17\n2026-11-19\n2026-11-24");
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-24"]);
    expect(invalid).toEqual([]);
  });

  it("reads the US forms admins paste out of a syllabus", () => {
    const { dates, invalid } = parseClassDates("11/17/2026, 11-19-26, 11/24/2026");
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-24"]);
    expect(invalid).toEqual([]);
  });

  it("reads month names, long and abbreviated, with or without a comma", () => {
    const { dates, invalid } = parseClassDates(
      "Nov 17 2026\nNovember 19, 2026\nDec 1st 2026\n17 Jan 2027"
    );
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-12-01", "2027-01-17"]);
    expect(invalid).toEqual([]);
  });

  it("strips a leading weekday, which is how calendars copy out", () => {
    const { dates } = parseClassDates("Tue 11/17/2026\nThursday 11/19/2026\nSat, Nov 21 2026");
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-21"]);
  });

  it("splits on commas, semicolons, tabs and newlines alike", () => {
    const { dates } = parseClassDates("2026-11-17;2026-11-19\t2026-11-24,2026-11-26");
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-24", "2026-11-26"]);
  });

  it("de-duplicates and sorts, so a messy paste still gives a clean calendar", () => {
    const { dates } = parseClassDates("11/24/2026\n2026-11-17\nNov 24 2026\n11/17/26");
    expect(dates).toEqual(["2026-11-17", "2026-11-24"]);
  });

  it("does not shift a date by a day — the whole reason this is not Date-based", () => {
    // A Date-based parse of "2026-01-01" lands on UTC midnight and reads back as
    // 2025-12-31 anywhere west of Greenwich.
    const { dates } = parseClassDates("2026-01-01");
    expect(dates).toEqual(["2026-01-01"]);
  });

  it("rejects a day that does not exist instead of rolling it over", () => {
    // new Date(2026, 1, 30) is 2 March. Silently scheduling class then would be
    // worse than telling the admin their line is wrong.
    const { dates, invalid } = parseClassDates("2026-02-30\n2026-13-01\n2026-11-32");
    expect(dates).toEqual([]);
    expect(invalid).toEqual(["2026-02-30", "2026-13-01", "2026-11-32"]);
  });

  it("accepts 29 February in a leap year and rejects it otherwise", () => {
    expect(parseClassDates("2028-02-29").dates).toEqual(["2028-02-29"]);
    expect(parseClassDates("2026-02-29").invalid).toEqual(["2026-02-29"]);
    // 2100 is not a leap year, and is outside the accepted range anyway.
    expect(parseClassDates("2000-02-29").dates).toEqual(["2000-02-29"]);
  });

  it("reports what it could not read rather than dropping it", () => {
    const { dates, invalid } = parseClassDates("2026-11-17\nevery other Tuesday\n11/19/2026\nTBD");
    expect(dates).toEqual(["2026-11-17", "2026-11-19"]);
    expect(invalid).toEqual(["every other Tuesday", "TBD"]);
  });

  it("ignores blank lines and stray whitespace", () => {
    const { dates, invalid } = parseClassDates("\n  2026-11-17  \n\n\t\n  11/19/2026\n");
    expect(dates).toEqual(["2026-11-17", "2026-11-19"]);
    expect(invalid).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(parseClassDates("")).toEqual({ dates: [], invalid: [] });
    expect(parseClassDates("   \n  ")).toEqual({ dates: [], invalid: [] });
  });

  it("rejects a bare month/day with no year rather than guessing one", () => {
    const { dates, invalid } = parseClassDates("11/17\nNov 17");
    expect(dates).toEqual([]);
    expect(invalid).toEqual(["11/17", "Nov 17"]);
  });
});

describe("parseClassDates comma handling", () => {
  it("keeps a comma inside a month-name date while still splitting the list", () => {
    const { dates, invalid } = parseClassDates(
      "November 17, 2026, November 19, 2026, December 1, 2026"
    );
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-12-01"]);
    expect(invalid).toEqual([]);
  });

  it("still splits a comma-separated list of numeric dates", () => {
    const { dates, invalid } = parseClassDates("2026-11-17, 2026-11-19, 2026-11-24");
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-24"]);
    expect(invalid).toEqual([]);
  });

  it("handles a mixed paste of both styles", () => {
    const { dates, invalid } = parseClassDates(
      "Tue, Nov 17, 2026\n11/19/2026\n2026-11-24\nNovember 26, 2026"
    );
    expect(dates).toEqual(["2026-11-17", "2026-11-19", "2026-11-24", "2026-11-26"]);
    expect(invalid).toEqual([]);
  });
});

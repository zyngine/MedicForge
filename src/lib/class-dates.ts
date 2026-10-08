/**
 * Parsing a pasted list of class dates.
 *
 * Its own module rather than living with the hooks: the hooks file constructs a
 * Supabase client at import time, and this is a pure string function that should
 * be usable — and testable — without one.
 */

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Zero-pad to two digits. */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Does this y/m/d triple name a real day?
 *
 * Checked explicitly rather than by round-tripping through Date, because Date
 * silently rolls over: new Date(2026, 1, 30) is 2 March, so a typo of "2/30"
 * would quietly schedule a class on the wrong day.
 */
function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
    return day <= 29;
  }
  return day <= lengths[month - 1];
}

/** Two-digit years: 26 -> 2026. Nobody is pasting a 1990s class calendar. */
function expandYear(raw: string): number {
  const n = parseInt(raw, 10);
  return raw.length <= 2 ? 2000 + n : n;
}

/**
 * Turn whatever an admin pasted into calendar dates.
 *
 * Accepts one date per line, or several on a line separated by commas,
 * semicolons or tabs, in any of the forms people actually paste out of a
 * syllabus: 2026-11-17, 11/17/2026, 11-17-26, Nov 17 2026, November 17, 2026.
 *
 * Returns YYYY-MM-DD strings built by string arithmetic, never via Date. A
 * Date-based parse of "2026-11-17" is interpreted as UTC midnight and comes back
 * out a day earlier anywhere west of Greenwich, which is the class-night bug
 * this codebase has already been through once.
 *
 * Anything it cannot read is returned in `invalid` rather than dropped, so the
 * admin is told which lines did not take instead of quietly getting a short
 * calendar.
 */
export function parseClassDates(input: string): { dates: string[]; invalid: string[] } {
  const dates: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  // "November 19, 2026" carries a comma inside a single date, and the comma is
  // also the separator between dates. Close up that one case first — matched
  // only when a month *name* precedes the day, so a numeric list like
  // "2026-11-17, 2026-11-19" is left alone to be split normally.
  const joined = input.replace(
    /([a-z]{3,}\.?\s+\d{1,2}(?:st|nd|rd|th)?)\s*,\s*(\d{2,4})(?![\d-/])/gi,
    "$1 $2"
  );

  // Split on newlines, commas, semicolons and tabs. Not on spaces: "Nov 17 2026"
  // is one date.
  const tokens = joined
    .split(/[\n\r,;\t]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  for (const token of tokens) {
    // Strip a leading weekday name — "Tue 11/17/2026" pastes out of calendars.
    const cleaned = token
      .replace(/^(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)[a-z]*\.?\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();

    // A weekday on its own: "Tue, Nov 17, 2026" splits the weekday off into its
    // own token. It carries no date, but it is not a mistake either, so drop it
    // rather than reporting it back to the admin as a line that failed.
    if (/^(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)[a-z]*\.?$/i.test(cleaned)) {
      continue;
    }

    let match: RegExpMatchArray | null;
    let year = 0;
    let month = 0;
    let day = 0;

    // ISO: 2026-11-17 or 2026/11/17
    if ((match = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    }
    // US: 11/17/2026, 11-17-26
    else if ((match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/))) {
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = expandYear(match[3]);
    }
    // Month name first: Nov 17 2026, November 17, 2026 (comma already split off)
    else if ((match = cleaned.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{2,4})$/i))) {
      const idx = MONTH_NAMES.findIndex((m) => m.startsWith(match![1].toLowerCase()));
      if (idx >= 0) {
        month = idx + 1;
        day = parseInt(match[2], 10);
        year = expandYear(match[3]);
      }
    }
    // Day first: 17 Nov 2026
    else if ((match = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?\s+(\d{2,4})$/i))) {
      const idx = MONTH_NAMES.findIndex((m) => m.startsWith(match![2].toLowerCase()));
      if (idx >= 0) {
        day = parseInt(match[1], 10);
        month = idx + 1;
        year = expandYear(match[3]);
      }
    }

    if (!isRealDate(year, month, day)) {
      invalid.push(token);
      continue;
    }

    const iso = `${year}-${pad2(month)}-${pad2(day)}`;
    if (!seen.has(iso)) {
      seen.add(iso);
      dates.push(iso);
    }
  }

  dates.sort();
  return { dates, invalid };
}

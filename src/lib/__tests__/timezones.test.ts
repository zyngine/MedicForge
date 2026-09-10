import { describe, it, expect } from "vitest";
import {
  US_TIMEZONES,
  timezoneForState,
  isSplitTimezoneState,
  timeInZone,
} from "../timezones";

describe("timezoneForState", () => {
  it("maps common states", () => {
    expect(timezoneForState("PA")).toBe("America/New_York");
    expect(timezoneForState("TX")).toBe("America/Chicago");
    expect(timezoneForState("CA")).toBe("America/Los_Angeles");
    expect(timezoneForState("CO")).toBe("America/Denver");
  });

  it("handles the no-DST zones", () => {
    expect(timezoneForState("AZ")).toBe("America/Phoenix");
    expect(timezoneForState("HI")).toBe("Pacific/Honolulu");
  });

  it("is case and whitespace insensitive", () => {
    expect(timezoneForState(" tx ")).toBe("America/Chicago");
    expect(timezoneForState("Tx")).toBe("America/Chicago");
  });

  it("returns null for unknown, empty and missing input", () => {
    expect(timezoneForState("XX")).toBeNull();
    expect(timezoneForState("")).toBeNull();
    expect(timezoneForState(null)).toBeNull();
    expect(timezoneForState(undefined)).toBeNull();
  });

  it("returns a zone that is offered in the picker", () => {
    // A suggestion the Select cannot display would silently blank the field.
    const offered = new Set(US_TIMEZONES.map((t) => t.value));
    for (const state of ["PA", "TX", "CA", "AZ", "HI", "AK", "IN", "MI", "ID", "PR"]) {
      const tz = timezoneForState(state);
      expect(tz, `${state} -> ${tz}`).not.toBeNull();
      expect(offered.has(tz as never), `${tz} is in US_TIMEZONES`).toBe(true);
    }
  });

  it("covers every state the picker implies, with no duplicate option values", () => {
    const values = US_TIMEZONES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("isSplitTimezoneState", () => {
  it("flags states that straddle a boundary", () => {
    expect(isSplitTimezoneState("TN")).toBe(true);
    expect(isSplitTimezoneState("fl")).toBe(true);
    expect(isSplitTimezoneState("TX")).toBe(true);
  });

  it("does not flag single-zone states", () => {
    expect(isSplitTimezoneState("PA")).toBe(false);
    expect(isSplitTimezoneState("CA")).toBe(false);
  });

  it("does not flag empty input", () => {
    expect(isSplitTimezoneState("")).toBe(false);
    expect(isSplitTimezoneState(null)).toBe(false);
  });
});

describe("timeInZone", () => {
  it("renders the same instant differently per zone", () => {
    // 2026-10-08T01:30:00Z is still Wednesday the 7th in Chicago.
    const instant = new Date("2026-10-08T01:30:00Z");
    expect(timeInZone("America/Chicago", instant)).toContain("Wed");
    expect(timeInZone("America/New_York", instant)).toContain("Wed");
    expect(timeInZone("UTC", instant)).toContain("Thu");
  });

  it("returns null for an unknown zone rather than throwing", () => {
    expect(timeInZone("Mars/Olympus_Mons")).toBeNull();
  });
});

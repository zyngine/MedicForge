import { describe, it, expect } from "vitest";
import { toDateTimeLocalValue, fromDateTimeLocalValue } from "../utils";

describe("fromDateTimeLocalValue", () => {
  it("reads the input's value as local time, not UTC", () => {
    // The bug: sending "2026-11-17T23:00" straight to a timestamptz column
    // stored 23:00 UTC, so an 11pm Eastern deadline read back as 6pm Eastern.
    const stored = fromDateTimeLocalValue("2026-11-17T23:00");
    expect(stored).toBe(new Date(2026, 10, 17, 23, 0).toISOString());
  });

  it("round-trips with toDateTimeLocalValue", () => {
    // What the instructor typed is what they see when they come back.
    const typed = "2026-11-17T23:00";
    expect(toDateTimeLocalValue(fromDateTimeLocalValue(typed))).toBe(typed);
  });

  it("survives repeated open-and-save without drifting", () => {
    // The reported symptom: the time moved by the offset every time it saved.
    let value = "2026-06-30T22:45";
    for (let i = 0; i < 5; i++) {
      value = toDateTimeLocalValue(fromDateTimeLocalValue(value));
    }
    expect(value).toBe("2026-06-30T22:45");
  });

  it("returns null for an empty value so the field can be cleared", () => {
    // "" previously became undefined, which the update skipped entirely —
    // the date could never be removed, it just reverted.
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue(null)).toBeNull();
    expect(fromDateTimeLocalValue(undefined)).toBeNull();
    expect(fromDateTimeLocalValue("   ")).toBeNull();
  });

  it("returns null rather than an Invalid Date for junk", () => {
    expect(fromDateTimeLocalValue("not a date")).toBeNull();
  });
});

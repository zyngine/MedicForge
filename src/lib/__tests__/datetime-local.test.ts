import { describe, it, expect } from "vitest";
import { toDateTimeLocalValue } from "../utils";

describe("toDateTimeLocalValue", () => {
  it("formats an instant as local wall-clock time, not UTC", () => {
    // The bug: toISOString().slice(0,16) hands a datetime-local input a UTC
    // string. The input shows it as local, so the displayed time moves by the
    // offset — and saving writes the moved value back.
    const date = new Date(2026, 10, 17, 23, 0); // 17 Nov 2026, 11:00pm local
    expect(toDateTimeLocalValue(date)).toBe("2026-11-17T23:00");
  });

  it("round-trips: what it renders is what the input would return", () => {
    const date = new Date(2026, 0, 1, 0, 5);
    const rendered = toDateTimeLocalValue(date);
    // A datetime-local value parses back as local time.
    const reparsed = new Date(rendered);
    expect(toDateTimeLocalValue(reparsed)).toBe(rendered);
  });

  it("is stable across repeated open-and-save cycles", () => {
    // The reported symptom was the time shifting every time the form was saved.
    let value = toDateTimeLocalValue(new Date(2026, 5, 30, 22, 45));
    for (let i = 0; i < 5; i++) {
      value = toDateTimeLocalValue(new Date(value));
    }
    expect(value).toBe("2026-06-30T22:45");
  });

  it("zero-pads every component", () => {
    expect(toDateTimeLocalValue(new Date(2026, 0, 2, 3, 4))).toBe("2026-01-02T03:04");
  });

  it("accepts an ISO string as well as a Date", () => {
    const iso = new Date(2026, 8, 15, 14, 30).toISOString();
    expect(toDateTimeLocalValue(iso)).toBe("2026-09-15T14:30");
  });

  it("returns empty for nothing, rather than 'Invalid Date'", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
    expect(toDateTimeLocalValue(undefined)).toBe("");
    expect(toDateTimeLocalValue("")).toBe("");
    expect(toDateTimeLocalValue("not a date")).toBe("");
  });
});

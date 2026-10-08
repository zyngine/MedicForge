import { describe, it, expect } from "vitest";
import { formatVitalsSummary, contactVitalsEntry } from "../vitals-format";

describe("formatVitalsSummary", () => {
  it("renders a full set in a fixed order", () => {
    expect(
      formatVitalsSummary({
        bp_systolic: 128,
        bp_diastolic: 82,
        pulse: 76,
        respiratory_rate: 16,
        spo2: 98,
        temperature: 98.6,
        gcs: 15,
        pain_scale: 3,
      })
    ).toBe("128/82 · HR 76 · RR 16 · SpO2 98% · 98.6°F · GCS 15 · Pain 3");
  });

  it("omits what was never measured rather than printing a dash", () => {
    // A set taken without a thermometer should not imply one was used.
    expect(formatVitalsSummary({ bp_systolic: 120, bp_diastolic: 80, pulse: 72 })).toBe(
      "120/80 · HR 72"
    );
  });

  it("shows a half-taken blood pressure rather than dropping it", () => {
    expect(formatVitalsSummary({ bp_systolic: 120 })).toBe("120/?");
    expect(formatVitalsSummary({ bp_diastolic: 80 })).toBe("?/80");
  });

  it("keeps a genuine zero, which is a reading and not a blank", () => {
    // Pain 0 and GCS are real values; treating 0 as absent would hide them.
    expect(formatVitalsSummary({ pain_scale: 0 })).toBe("Pain 0");
  });

  it("treats null, undefined and empty string alike", () => {
    expect(
      formatVitalsSummary({
        bp_systolic: null,
        pulse: undefined,
        spo2: "",
        respiratory_rate: 18,
      })
    ).toBe("RR 18");
  });

  it("accepts numbers stored as strings, which is how loose JSONB comes back", () => {
    expect(formatVitalsSummary({ pulse: "88", spo2: "97" })).toBe("HR 88 · SpO2 97%");
  });

  it("says so plainly when a set holds nothing", () => {
    expect(formatVitalsSummary({})).toBe("No values recorded");
  });
});

describe("contactVitalsEntry", () => {
  it("reads the shape the patient contact wizard writes", () => {
    const parsed = contactVitalsEntry({
      time: "14:30",
      bp_systolic: 130,
      bp_diastolic: 84,
      pulse: 88,
      respiratory_rate: 18,
      spo2: 96,
      temperature: 99.1,
      gcs: 15,
      pain_scale: 4,
    });
    expect(parsed.time).toBe("14:30");
    expect(formatVitalsSummary(parsed)).toBe(
      "130/84 · HR 88 · RR 18 · SpO2 96% · 99.1°F · GCS 15 · Pain 4"
    );
  });

  it("accepts the short key names the column comment documents", () => {
    // The column's own comment says {..., resp, temp, pain}; the wizard writes
    // the long names. Reading only one spelling would show a set as empty.
    const parsed = contactVitalsEntry({ resp: 20, temp: 100.4, pain: 7 });
    expect(formatVitalsSummary(parsed)).toBe("RR 20 · 100.4°F · Pain 7");
  });

  it("prefers the long key when both spellings are present", () => {
    const parsed = contactVitalsEntry({ respiratory_rate: 12, resp: 99 });
    expect(parsed.respiratory_rate).toBe(12);
  });

  it("does not invent a time when there is not one", () => {
    expect(contactVitalsEntry({ pulse: 60 }).time).toBeUndefined();
    expect(contactVitalsEntry({ pulse: 60, time: 1430 }).time).toBeUndefined();
  });

  it("survives junk instead of throwing", () => {
    // vitals is a bare JSONB array with nothing stopping a string or null
    // landing in it, and one bad entry must not take the panel down.
    expect(formatVitalsSummary(contactVitalsEntry(null))).toBe("No values recorded");
    expect(formatVitalsSummary(contactVitalsEntry("nonsense"))).toBe("No values recorded");
    expect(formatVitalsSummary(contactVitalsEntry(42))).toBe("No values recorded");
  });
});

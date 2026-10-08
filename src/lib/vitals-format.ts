/**
 * Reading and rendering a set of vital signs.
 *
 * Its own module rather than living with the hooks: the hooks file builds a
 * Supabase client at import time, and these are pure functions over data that
 * arrives in two different shapes, which is exactly the part worth testing.
 */

/**
 * The measurements of one set, from either place vitals are stored.
 *
 * Loose on purpose: the same shape describes a student_vital_signs row and an
 * entry inside clinical_patient_contacts.vitals, which is free-form JSONB
 * written by the patient contact wizard rather than a typed column.
 */
export interface VitalsMeasurements {
  bp_systolic?: number | string | null;
  bp_diastolic?: number | string | null;
  pulse?: number | string | null;
  respiratory_rate?: number | string | null;
  spo2?: number | string | null;
  temperature?: number | string | null;
  blood_glucose?: number | string | null;
  gcs?: number | string | null;
  pain_scale?: number | string | null;
}

/** Treats null, undefined and "" alike — a blank field was never measured. */
function present(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

/**
 * Compact one-line summary of a set, for a table row.
 *
 * Only shows what was actually recorded: a set taken without a thermometer
 * should read "128/82 · HR 76", not "128/82 · HR 76 · Temp —".
 */
export function formatVitalsSummary(v: VitalsMeasurements): string {
  const parts: string[] = [];
  if (present(v.bp_systolic) || present(v.bp_diastolic)) {
    parts.push(`${present(v.bp_systolic) ? v.bp_systolic : "?"}/${present(v.bp_diastolic) ? v.bp_diastolic : "?"}`);
  }
  if (present(v.pulse)) parts.push(`HR ${v.pulse}`);
  if (present(v.respiratory_rate)) parts.push(`RR ${v.respiratory_rate}`);
  if (present(v.spo2)) parts.push(`SpO2 ${v.spo2}%`);
  if (present(v.temperature)) parts.push(`${v.temperature}\u00B0F`);
  if (present(v.blood_glucose)) parts.push(`BGL ${v.blood_glucose}`);
  if (present(v.gcs)) parts.push(`GCS ${v.gcs}`);
  if (present(v.pain_scale)) parts.push(`Pain ${v.pain_scale}`);
  return parts.length > 0 ? parts.join(" \u00B7 ") : "No values recorded";
}

/** An entry inside clinical_patient_contacts.vitals, read defensively. */
export function contactVitalsEntry(raw: unknown): VitalsMeasurements & { time?: string } {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  // The wizard writes the long names; the column's own comment documents short
  // ones (resp/temp/pain), so accept both rather than silently showing a set as
  // empty because it came from somewhere else.
  return {
    bp_systolic: (o.bp_systolic ?? null) as number | null,
    bp_diastolic: (o.bp_diastolic ?? null) as number | null,
    pulse: (o.pulse ?? null) as number | null,
    respiratory_rate: (o.respiratory_rate ?? o.resp ?? null) as number | null,
    spo2: (o.spo2 ?? null) as number | null,
    temperature: (o.temperature ?? o.temp ?? null) as number | null,
    gcs: (o.gcs ?? null) as number | null,
    pain_scale: (o.pain_scale ?? o.pain ?? null) as number | null,
    time: typeof o.time === "string" ? o.time : undefined,
  };
}

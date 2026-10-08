/**
 * Timezone options for tenant settings, and the same US state -> IANA mapping
 * the state_to_timezone() SQL function uses, so the UI can suggest a value that
 * matches what the backfill would have chosen.
 */

export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern — New York" },
  { value: "America/Detroit", label: "Eastern — Detroit" },
  { value: "America/Indiana/Indianapolis", label: "Eastern — Indianapolis" },
  { value: "America/Chicago", label: "Central — Chicago" },
  { value: "America/Denver", label: "Mountain — Denver" },
  { value: "America/Boise", label: "Mountain — Boise" },
  { value: "America/Phoenix", label: "Mountain — Phoenix (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles" },
  { value: "America/Anchorage", label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Honolulu (no DST)" },
  { value: "America/Puerto_Rico", label: "Atlantic — Puerto Rico" },
  { value: "America/St_Thomas", label: "Atlantic — US Virgin Islands" },
  { value: "Pacific/Guam", label: "Chamorro — Guam" },
  { value: "Pacific/Saipan", label: "Chamorro — Northern Mariana Islands" },
  { value: "Pacific/Pago_Pago", label: "Samoa — American Samoa" },
] as const;

/**
 * Twelve states straddle a timezone boundary. For those this returns the zone
 * most of the state's population is in — a starting suggestion, not an
 * authority, which is why the value is stored and editable.
 */
const STATE_TIMEZONES: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DC: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  IA: "America/Chicago",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  MA: "America/New_York",
  MD: "America/New_York",
  ME: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MO: "America/Chicago",
  MS: "America/Chicago",
  MT: "America/Denver",
  NC: "America/New_York",
  ND: "America/Chicago",
  NE: "America/Chicago",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NV: "America/Los_Angeles",
  NY: "America/New_York",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VA: "America/New_York",
  VT: "America/New_York",
  WA: "America/Los_Angeles",
  WI: "America/Chicago",
  WV: "America/New_York",
  WY: "America/Denver",
  PR: "America/Puerto_Rico",
  VI: "America/St_Thomas",
  GU: "Pacific/Guam",
  MP: "Pacific/Saipan",
  AS: "Pacific/Pago_Pago",
};

/** States where the suggestion is wrong for part of the state. */
export const SPLIT_TIMEZONE_STATES = new Set([
  "FL", "ID", "IN", "KS", "KY", "MI", "ND", "NE", "OR", "SD", "TN", "TX",
]);

export function timezoneForState(state: string | null | undefined): string | null {
  if (!state) return null;
  return STATE_TIMEZONES[state.trim().toUpperCase()] ?? null;
}

export function isSplitTimezoneState(state: string | null | undefined): boolean {
  if (!state) return false;
  return SPLIT_TIMEZONE_STATES.has(state.trim().toUpperCase());
}

/** The browser's own timezone, used only as a last-resort suggestion. */
export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Current wall-clock time in a given zone, for showing the admin the effect. */
export function timeInZone(timezone: string, at: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(at);
  } catch {
    return null;
  }
}

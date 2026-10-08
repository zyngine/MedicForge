import { dateInTimeZone } from "@/lib/utils";

/**
 * Tenant-local dates for server code.
 *
 * API routes and server actions have no browser whose clock they can borrow, and
 * the server itself runs in UTC — so `new Date().toISOString().split("T")[0]`
 * there is the UTC date, which is already tomorrow during an evening class in
 * any US timezone. These read the tenant's configured timezone instead.
 *
 * A tenant with no timezone set falls back to UTC, which is the behaviour that
 * was there before. Set one on the Organization settings page.
 */

// The Supabase clients in this project are variously typed and untyped, and all
// this needs is a table read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const cache = new Map<string, { timezone: string | null; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getTenantTimezone(
  client: AnyClient,
  tenantId: string
): Promise<string | null> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.timezone;
  }

  let timezone: string | null = null;
  try {
    const { data } = await client
      .from("tenants")
      .select("timezone")
      .eq("id", tenantId)
      .maybeSingle();
    timezone = data?.timezone || null;
  } catch {
    timezone = null;
  }

  cache.set(tenantId, { timezone, at: Date.now() });
  return timezone;
}

/** Today's date in the tenant's timezone, as YYYY-MM-DD. */
export async function tenantToday(
  client: AnyClient,
  tenantId: string,
  now: Date = new Date()
): Promise<string> {
  const timezone = await getTenantTimezone(client, tenantId);
  return tenantDateString(now, timezone);
}

/**
 * A date N days from now in the tenant's timezone, as YYYY-MM-DD.
 * Positive for the future, negative for the past.
 */
export async function tenantDatePlusDays(
  client: AnyClient,
  tenantId: string,
  days: number,
  now: Date = new Date()
): Promise<string> {
  const timezone = await getTenantTimezone(client, tenantId);
  // Step by whole days on the tenant's own calendar so a daylight-saving change
  // does not shift the result — a day is not always 24 hours long.
  const todayStr = tenantDateString(now, timezone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Format an instant as a date in a timezone, falling back to UTC. */
export function tenantDateString(date: Date, timezone: string | null): string {
  if (!timezone) return date.toISOString().slice(0, 10);
  try {
    return dateInTimeZone(date, timezone);
  } catch {
    // An unrecognised zone must not take the request down.
    return date.toISOString().slice(0, 10);
  }
}

/** Exposed for tests. */
export function __clearTenantTimezoneCache() {
  cache.clear();
}

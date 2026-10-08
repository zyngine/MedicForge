import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getTenantTimezone,
  tenantToday,
  tenantDatePlusDays,
  tenantDateString,
  __clearTenantTimezoneCache,
} from "../tenant-time";

/** Minimal stand-in for the Supabase query builder shape these helpers use. */
function clientReturning(timezone: string | null, opts: { throws?: boolean } = {}) {
  const maybeSingle = vi.fn(async () => {
    if (opts.throws) throw new Error("connection lost");
    return { data: timezone === undefined ? null : { timezone }, error: null };
  });
  const client = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
    _maybeSingle: maybeSingle,
  };
  return client;
}

const TENANT = "11111111-1111-1111-1111-111111111111";

describe("tenantDateString", () => {
  it("formats in the given zone", () => {
    const instant = new Date("2026-10-08T01:30:00Z");
    expect(tenantDateString(instant, "America/Chicago")).toBe("2026-10-07");
    expect(tenantDateString(instant, "UTC")).toBe("2026-10-08");
  });

  it("falls back to UTC when no zone is set", () => {
    expect(tenantDateString(new Date("2026-10-08T01:30:00Z"), null)).toBe("2026-10-08");
  });

  it("falls back to UTC rather than throwing on an unrecognised zone", () => {
    expect(tenantDateString(new Date("2026-10-08T01:30:00Z"), "Mars/Olympus_Mons")).toBe(
      "2026-10-08"
    );
  });
});

describe("getTenantTimezone", () => {
  beforeEach(() => __clearTenantTimezoneCache());

  it("reads the tenant's timezone", async () => {
    const client = clientReturning("America/Chicago");
    await expect(getTenantTimezone(client, TENANT)).resolves.toBe("America/Chicago");
  });

  it("returns null when the tenant has none", async () => {
    const client = clientReturning(null);
    await expect(getTenantTimezone(client, TENANT)).resolves.toBeNull();
  });

  it("returns null instead of throwing when the query fails", async () => {
    const client = clientReturning("America/Chicago", { throws: true });
    await expect(getTenantTimezone(client, TENANT)).resolves.toBeNull();
  });

  it("caches, so a route that asks twice hits the database once", async () => {
    const client = clientReturning("America/Denver");
    await getTenantTimezone(client, TENANT);
    await getTenantTimezone(client, TENANT);
    expect(client._maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not let one tenant's cached value serve another", async () => {
    const chicago = clientReturning("America/Chicago");
    const denver = clientReturning("America/Denver");
    await expect(getTenantTimezone(chicago, TENANT)).resolves.toBe("America/Chicago");
    await expect(
      getTenantTimezone(denver, "22222222-2222-2222-2222-222222222222")
    ).resolves.toBe("America/Denver");
  });
});

describe("tenantToday", () => {
  beforeEach(() => __clearTenantTimezoneCache());

  it("uses the tenant's zone, which is the evening-class case", async () => {
    const client = clientReturning("America/Chicago");
    const evening = new Date("2026-10-08T01:30:00Z"); // 8:30pm Oct 7 in Chicago
    await expect(tenantToday(client, TENANT, evening)).resolves.toBe("2026-10-07");
  });

  it("falls back to the UTC date when the tenant has no zone", async () => {
    const client = clientReturning(null);
    const evening = new Date("2026-10-08T01:30:00Z");
    await expect(tenantToday(client, TENANT, evening)).resolves.toBe("2026-10-08");
  });
});

describe("tenantDatePlusDays", () => {
  beforeEach(() => __clearTenantTimezoneCache());

  it("counts days from the tenant's today, not the server's", async () => {
    const client = clientReturning("America/Chicago");
    const evening = new Date("2026-10-08T01:30:00Z"); // Oct 7 locally
    await expect(tenantDatePlusDays(client, TENANT, 90, evening)).resolves.toBe("2027-01-05");
  });

  it("accepts a negative offset", async () => {
    const client = clientReturning("America/Chicago");
    const evening = new Date("2026-10-08T01:30:00Z");
    await expect(tenantDatePlusDays(client, TENANT, -30, evening)).resolves.toBe("2026-09-07");
  });

  it("crosses a year boundary", async () => {
    const client = clientReturning("America/Chicago");
    const evening = new Date("2027-01-01T01:30:00Z"); // Dec 31 locally
    await expect(tenantDatePlusDays(client, TENANT, 1, evening)).resolves.toBe("2027-01-01");
  });

  it("is unaffected by daylight saving, because it steps whole days", async () => {
    const client = clientReturning("America/Chicago");
    // Mar 7 2026 locally; +2 days spans the spring-forward on Mar 8.
    const before = new Date("2026-03-08T02:30:00Z");
    await expect(tenantDatePlusDays(client, TENANT, 2, before)).resolves.toBe("2026-03-09");
  });
});

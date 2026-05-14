import { CUSTOM_TRAINING_TIERS } from "@/lib/ce-tiers";

// Same tier list as custom training: enterprise / enterprise_plus / custom.
// If you want CE catalog access on a different tier set, change this list.
export const AGENCY_CE_ACCESS_TIERS = CUSTOM_TRAINING_TIERS;

export function agencyTierCoversCatalog(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return (AGENCY_CE_ACCESS_TIERS as readonly string[]).includes(tier);
}

/**
 * Server-side: returns agency access info for a CE user.
 * Uses an admin (service-role) Supabase client.
 */
export async function getAgencyAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
): Promise<{ covers: boolean; agencyId: string | null; agencyName: string | null; tier: string | null }> {
  const { data: ce } = await admin
    .from("ce_users")
    .select("agency_id")
    .eq("id", userId)
    .maybeSingle();
  if (!ce?.agency_id) return { covers: false, agencyId: null, agencyName: null, tier: null };

  const { data: agency } = await admin
    .from("ce_agencies")
    .select("id, name, subscription_tier")
    .eq("id", ce.agency_id)
    .maybeSingle();
  if (!agency) return { covers: false, agencyId: ce.agency_id, agencyName: null, tier: null };

  return {
    covers: agencyTierCoversCatalog(agency.subscription_tier),
    agencyId: agency.id,
    agencyName: agency.name,
    tier: agency.subscription_tier,
  };
}

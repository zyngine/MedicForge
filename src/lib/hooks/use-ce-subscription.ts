"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { agencyTierCoversCatalog } from "@/lib/ce-agency-access";

export interface CESubscriptionState {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscriptionPrice: number | null;
  isAuthenticated: boolean;
  /** True if the user's agency is on a tier that covers all CE catalog courses. */
  agencyCovers: boolean;
  agencyName: string | null;
  /** True if the user has access to all catalog courses via subscription OR agency tier. */
  hasUnlimitedAccess: boolean;
}

export function useCEActiveSubscription(): CESubscriptionState {
  const [state, setState] = useState<CESubscriptionState>({
    loading: true,
    hasActiveSubscription: false,
    subscriptionPrice: null,
    isAuthenticated: false,
    agencyCovers: false,
    agencyName: null,
    hasUnlimitedAccess: false,
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const [{ data: { user } }, priceRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("ce_platform_settings")
          .select("value")
          .eq("key", "annual_subscription_price")
          .maybeSingle(),
      ]);

      const price = priceRes.data?.value ? parseFloat(priceRes.data.value) : null;

      if (!user) {
        setState({
          loading: false,
          hasActiveSubscription: false,
          subscriptionPrice: price,
          isAuthenticated: false,
          agencyCovers: false,
          agencyName: null,
          hasUnlimitedAccess: false,
        });
        return;
      }

      const { data: ce } = await supabase
        .from("ce_users")
        .select("agency_id")
        .eq("id", user.id)
        .maybeSingle();

      const [{ data: sub }, agencyRes] = await Promise.all([
        supabase
          .from("ce_user_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle(),
        ce?.agency_id
          ? supabase
              .from("ce_agencies")
              .select("name, subscription_tier")
              .eq("id", ce.agency_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const hasActiveSubscription = !!sub;
      const agencyCovers = agencyTierCoversCatalog(agencyRes.data?.subscription_tier);

      setState({
        loading: false,
        hasActiveSubscription,
        subscriptionPrice: price,
        isAuthenticated: true,
        agencyCovers,
        agencyName: agencyRes.data?.name ?? null,
        hasUnlimitedAccess: hasActiveSubscription || agencyCovers,
      });
    };
    load();
  }, []);

  return state;
}

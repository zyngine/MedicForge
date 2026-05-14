"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";

export interface CESubscriptionState {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscriptionPrice: number | null;
  isAuthenticated: boolean;
}

export function useCEActiveSubscription(): CESubscriptionState {
  const [state, setState] = useState<CESubscriptionState>({
    loading: true,
    hasActiveSubscription: false,
    subscriptionPrice: null,
    isAuthenticated: false,
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
        setState({ loading: false, hasActiveSubscription: false, subscriptionPrice: price, isAuthenticated: false });
        return;
      }

      const { data: sub } = await supabase
        .from("ce_user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      setState({
        loading: false,
        hasActiveSubscription: !!sub,
        subscriptionPrice: price,
        isAuthenticated: true,
      });
    };
    load();
  }, []);

  return state;
}

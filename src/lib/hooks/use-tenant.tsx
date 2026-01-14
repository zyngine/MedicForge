"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

// Singleton supabase client
const supabase = createClient();

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  settings: Record<string, unknown>;
  subscription_tier: "free" | "pro" | "institution" | "enterprise";
  subscription_status: "active" | "canceled" | "past_due" | "trialing";
  trial_ends_at: string | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  isMainSite: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Get tenant slug from cookie (set by middleware)
function getTenantSlugFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "tenant_slug") {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Get tenant ID from cookie (set by middleware)
function getTenantIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "tenant_id") {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchTenant = async () => {
    try {
      let tenantId = getTenantIdFromCookie();

      // If no tenant cookie, try to get tenant from logged-in user's profile
      if (!tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch user's tenant_id from their profile
          const { data: userProfile } = await supabase
            .from("users")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

          if (userProfile?.tenant_id) {
            tenantId = userProfile.tenant_id;
            // Set the cookie for future requests (client-side only)
            document.cookie = `tenant_id=${encodeURIComponent(tenantId)}; path=/; samesite=lax`;
            document.cookie = `tenant_slug=user-tenant; path=/; samesite=lax`;
          }
        }
      }

      if (!tenantId) {
        // No tenant cookie and no logged-in user = main marketing site
        if (mountedRef.current) {
          setTenant(null);
          setIsLoading(false);
        }
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (!mountedRef.current) return;

      if (fetchError) {
        console.error("Error fetching tenant:", fetchError);
        setError(new Error("Failed to load tenant"));
        setTenant(null);
      } else {
        setTenant({
          id: data.id,
          name: data.name,
          slug: data.slug,
          logo_url: data.logo_url,
          primary_color: data.primary_color || "#C53030",
          custom_domain: data.custom_domain,
          settings: (data.settings as Record<string, unknown>) || {},
          subscription_tier: data.subscription_tier as Tenant["subscription_tier"],
          subscription_status: data.subscription_status as Tenant["subscription_status"],
          trial_ends_at: data.trial_ends_at,
        });
        // Also set the tenant_slug cookie with actual slug
        if (typeof document !== "undefined") {
          document.cookie = `tenant_slug=${encodeURIComponent(data.slug)}; path=/; samesite=lax`;
        }
      }
    } catch (err) {
      // Ignore AbortErrors - these are expected when component unmounts or navigation occurs
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (mountedRef.current) {
        console.error("Tenant fetch error:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchTenant();

    // Listen for auth state changes to re-fetch tenant when user logs in/out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        fetchTenant();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshTenant = async () => {
    setIsLoading(true);
    await fetchTenant();
  };

  const isMainSite = !getTenantSlugFromCookie();

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        error,
        isMainSite,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

// Hook to get tenant-scoped data
export function useTenantId(): string | null {
  const { tenant } = useTenant();
  return tenant?.id || null;
}

// Hook for checking subscription limits
export function useSubscriptionLimits() {
  const { tenant } = useTenant();

  const limits = {
    free: { instructors: 1, students: 25, courses: 2, storage: 1 },
    pro: { instructors: 5, students: 100, courses: -1, storage: 25 },
    institution: { instructors: -1, students: 500, courses: -1, storage: 100 },
    enterprise: { instructors: -1, students: -1, courses: -1, storage: -1 },
  };

  const tier = tenant?.subscription_tier || "free";
  const tierLimits = limits[tier];

  return {
    tier,
    limits: tierLimits,
    canAddInstructor: (current: number) =>
      tierLimits.instructors === -1 || current < tierLimits.instructors,
    canAddStudent: (current: number) =>
      tierLimits.students === -1 || current < tierLimits.students,
    canAddCourse: (current: number) =>
      tierLimits.courses === -1 || current < tierLimits.courses,
    storageGb: tierLimits.storage,
  };
}

// Hook to apply tenant branding
export function useTenantBranding() {
  const { tenant, isMainSite } = useTenant();

  useEffect(() => {
    if (tenant?.primary_color && !isMainSite) {
      // Apply tenant's primary color as CSS variable
      document.documentElement.style.setProperty("--primary", tenant.primary_color);
      document.documentElement.style.setProperty("--ring", tenant.primary_color);
    }

    return () => {
      // Reset to default when unmounting or leaving tenant site
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    };
  }, [tenant?.primary_color, isMainSite]);

  return {
    logoUrl: tenant?.logo_url || "/logo.svg",
    primaryColor: tenant?.primary_color || "#C53030",
    tenantName: tenant?.name || "MedicForge",
    isWhiteLabeled: !!tenant?.logo_url,
  };
}

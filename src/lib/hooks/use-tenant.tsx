"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

// Singleton supabase client
const supabase = createClient();

// Module-level cache for tenant state to persist across navigations
let cachedTenant: Tenant | null = null;
let tenantInitialized = false;

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  settings: Record<string, unknown>;
  subscription_tier: "free" | "pro" | "professional" | "institution" | "enterprise" | "agency-starter" | "agency-pro" | "agency-enterprise";
  subscription_status: "active" | "canceled" | "past_due" | "trialing";
  trial_ends_at: string | null;
  agency_code: string | null;
  white_label_enabled: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  isMainSite: boolean;
  refreshTenant: () => Promise<void>;
  refetch: () => Promise<void>;
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
  // Initialize from cache to prevent loading flash on navigation
  const [tenant, setTenant] = useState<Tenant | null>(cachedTenant);
  const [isLoading, setIsLoading] = useState(!tenantInitialized);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTenant = async () => {
    // If already initialized and cached, skip fetch
    if (tenantInitialized && cachedTenant !== undefined) {
      setTenant(cachedTenant);
      setIsLoading(false);
      return;
    }

    try {
      let tenantId = getTenantIdFromCookie();

      // If no tenant cookie, try to get tenant from logged-in user's profile
      if (!tenantId) {
        const { data: { user } } = await (supabase as any).auth.getUser();
        if (user) {
          // Check if user is a platform admin (they won't have a tenant)
          const { data: isPlatformAdmin } = await (supabase as any).rpc("is_platform_admin");
          if (isPlatformAdmin) {
            // Platform admins don't have tenants, skip tenant lookup
            if (mountedRef.current) {
              cachedTenant = null;
              tenantInitialized = true;
              setTenant(null);
              setIsLoading(false);
            }
            return;
          }

          // Fetch user's tenant_id from their profile
          const { data: userProfile } = await (supabase as any)
            .from("users")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

          if (userProfile?.tenant_id) {
            tenantId = userProfile.tenant_id;
            // Set the cookie for future requests (client-side only)
            document.cookie = `tenant_id=${encodeURIComponent(tenantId!)}; path=/; samesite=lax`;
            document.cookie = `tenant_slug=user-tenant; path=/; samesite=lax`;
          }
        }
      }

      if (!tenantId) {
        // No tenant cookie and no logged-in user = main marketing site
        if (mountedRef.current) {
          cachedTenant = null;
          tenantInitialized = true;
          setTenant(null);
          setIsLoading(false);
        }
        return;
      }

      const { data, error: fetchError } = await (supabase as any)
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (!mountedRef.current) return;

      if (fetchError) {
        console.error("Error fetching tenant:", fetchError);
        setError(new Error("Failed to load tenant"));
        cachedTenant = null;
        tenantInitialized = true;
        setTenant(null);
      } else {
        const tenantData: Tenant = {
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
          agency_code: data.agency_code || null,
          white_label_enabled: data.white_label_enabled || false,
        };
        cachedTenant = tenantData;
        tenantInitialized = true;
        setTenant(tenantData);
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
        tenantInitialized = true;
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !tenantInitialized) {
        console.warn("Tenant fetch timed out after 5 seconds");
        tenantInitialized = true;
        setIsLoading(false);
        // Clear any potentially stale auth state that might be causing the hang
        if (!cachedTenant) {
          // If we couldn't get tenant, clear auth cookies to allow fresh login
          document.cookie = "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }
    }, 5000);

    fetchTenant();

    // Listen for auth state changes to re-fetch tenant when user logs in/out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Clear cache on sign out
        cachedTenant = null;
        tenantInitialized = false;
        setTenant(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Re-fetch tenant on sign in
        tenantInitialized = false; // Force re-fetch
        fetchTenant();
      }
    });

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
        refetch: refreshTenant,
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

  const limits: Record<string, { instructors: number; students: number; courses: number; storage: number }> = {
    free: { instructors: 1, students: 25, courses: 2, storage: 1 },
    pro: { instructors: 5, students: 100, courses: -1, storage: 25 },
    professional: { instructors: 5, students: 100, courses: -1, storage: 25 },
    institution: { instructors: -1, students: 500, courses: -1, storage: 100 },
    enterprise: { instructors: -1, students: -1, courses: -1, storage: -1 },
    // Agency tiers
    "agency-starter": { instructors: 2, students: 50, courses: -1, storage: 10 },
    "agency-pro": { instructors: 5, students: 150, courses: -1, storage: 50 },
    "agency-enterprise": { instructors: -1, students: -1, courses: -1, storage: -1 },
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
    hideVendorBranding: tenant?.white_label_enabled || false,
  };
}

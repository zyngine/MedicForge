"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useState, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

// Singleton supabase client
const supabase = createClient();

// Module-level cache for tenant state to persist across navigations
let cachedTenant: Tenant | null = null;
let tenantInitialized = false;
let cachedTenantUserId: string | null = null; // Track which user ID the cache is for

// Clear tenant cache (call when user changes)
function clearTenantCache() {
  cachedTenant = null;
  tenantInitialized = false;
  cachedTenantUserId = null;
  clearCachedBranding();
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  subscription_tier: "free" | "pro" | "professional" | "institution" | "enterprise" | "agency-starter" | "agency-pro" | "agency-enterprise";
  subscription_status: "active" | "canceled" | "past_due" | "trialing";
  trial_ends_at: string | null;
  agency_code: string | null;
  white_label_enabled: boolean;
  tenant_type: "education" | "agency" | "combined";
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

// Main domains that should NOT be treated as tenant subdomains
const MAIN_DOMAINS = ["www.medicforge.net", "medicforge.net", "localhost", "127.0.0.1"];

// Get tenant slug from cookie (set by middleware)
function getTenantSlugFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "tenant_slug" && value && value !== "user-tenant") {
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
    if (name === "tenant_id" && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Extract tenant slug from hostname (e.g., "test" from "test.medicforge.net")
function getTenantSlugFromHostname(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // Check if this is a main domain
  const isMainDomain = MAIN_DOMAINS.some(domain =>
    hostname === domain || hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1")
  );

  if (isMainDomain) return null;

  // Extract subdomain
  const parts = hostname.split(".");
  if (parts.length >= 3 || (parts.length === 2 && !parts[1].includes("localhost"))) {
    const potentialSlug = parts[0];
    if (potentialSlug !== "www") {
      return potentialSlug;
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
  const fetchAttemptedRef = useRef(false);

  const fetchTenant = async () => {
    // CE platform routes and certificate verification don't use tenants — skip resolution entirely
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/ce") || path.startsWith("/verify")) {
        cachedTenant = null;
        tenantInitialized = true;
        setTenant(null);
        setIsLoading(false);
        return;
      }
    }

    // If already initialized and cached, skip fetch
    if (tenantInitialized && cachedTenant !== undefined) {
      setTenant(cachedTenant);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;

    // Helper to finalize tenant state (always sets tenantInitialized)
    const finalize = (tenantData: Tenant | null) => {
      if (!mountedRef.current) return;
      cachedTenant = tenantData;
      tenantInitialized = true;
      setTenant(tenantData);
      setIsLoading(false);
      if (tenantData && typeof document !== "undefined") {
        document.cookie = `tenant_id=${encodeURIComponent(tenantData.id)}; path=/; samesite=lax; max-age=86400`;
        document.cookie = `tenant_slug=${encodeURIComponent(tenantData.slug)}; path=/; samesite=lax; max-age=86400`;
      }
    };

    try {
      // STRATEGY 1: Try to get tenant ID from cookie (fastest)
      const tenantId = getTenantIdFromCookie();
      let tenantSlug = getTenantSlugFromCookie();

      // STRATEGY 2: If no cookie, try to get slug from hostname
      if (!tenantId && !tenantSlug) {
        tenantSlug = getTenantSlugFromHostname();
      }

      // STRATEGY 3: If we have a slug but no ID, query by slug (fast, single query)
      if (!tenantId && tenantSlug) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tenantBySlug, error: slugError } = await (supabase as any)
          .from("tenants")
          .select("*")
          .eq("slug", tenantSlug)
          .single();

        if (!slugError && tenantBySlug) {
          finalize(transformTenantData(tenantBySlug));
          return;
        }
        // Strategy 3 failed — log and continue to auth-based fallback
        if (slugError) {
          console.warn("[useTenant] Slug lookup failed:", slugError.message);
        }
      }

      // STRATEGY 4: If we have tenant ID, fetch by ID
      if (tenantId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase as any)
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (!mountedRef.current) return;

        if (!fetchError && data) {
          finalize(transformTenantData(data));
          return;
        }
        if (fetchError) {
          console.warn("[useTenant] ID lookup failed:", fetchError.message);
        }
      }

      // STRATEGY 5: Fall back to auth-based lookup (slowest, but works when cookies fail)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) {
        // No user, no cookies, no subdomain = main marketing site
        clearTenantCache();
        finalize(null);
        return;
      }

      // Check if user changed - if so, clear cached tenant
      if (cachedTenantUserId && cachedTenantUserId !== user.id) {
        clearTenantCache();
      }
      cachedTenantUserId = user.id;

      // Check if platform admin (they have no tenant)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: isPlatformAdmin } = await (supabase as any).rpc("is_platform_admin");
      if (isPlatformAdmin) {
        finalize(null);
        return;
      }

      // Get user's tenant_id from their profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userProfile } = await (supabase as any)
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!userProfile?.tenant_id) {
        console.warn("[useTenant] User has no tenant_id in profile:", user.id);
        finalize(null);
        return;
      }

      // Fetch tenant details by user's tenant_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenantData, error: tenantError } = await (supabase as any)
        .from("tenants")
        .select("*")
        .eq("id", userProfile.tenant_id)
        .single();

      if (tenantData) {
        finalize(transformTenantData(tenantData));
      } else {
        // All strategies exhausted — log details for debugging
        console.error("[useTenant] All strategies failed. tenant_id:", userProfile.tenant_id, "error:", tenantError?.message);
        finalize(null);
      }
    } catch (err) {
      // Ignore AbortErrors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (mountedRef.current) {
        console.error("[useTenant] Fetch error:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        // Always mark as initialized to prevent infinite loading
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
    fetchAttemptedRef.current = false;

    fetchTenant();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        clearTenantCache();
        fetchAttemptedRef.current = false;
        setTenant(null);
        setIsLoading(false);
        // Clear cookies on sign out
        if (typeof document !== "undefined") {
          document.cookie = "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Check if user changed
        const newUserId = session?.user?.id || null;
        if (cachedTenantUserId && newUserId && cachedTenantUserId !== newUserId) {
          clearTenantCache();
          fetchAttemptedRef.current = false;
          fetchTenant();
        } else if (!cachedTenant) {
          // Re-fetch if we don't have a tenant yet. This handles the case where
          // the initial fetch failed due to expired tokens (getSession timeout)
          // and the background refresh just completed with fresh tokens.
          // For main-site users (no subdomain), finalize(null) already ran and
          // this will resolve quickly via the cache check at the top of fetchTenant.
          const isOnSubdomain = !!getTenantSlugFromHostname() || !!getTenantSlugFromCookie();
          if (isOnSubdomain || !tenantInitialized) {
            tenantInitialized = false;
            fetchAttemptedRef.current = false;
            fetchTenant();
          }
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshTenant = async () => {
    tenantInitialized = false;
    fetchAttemptedRef.current = false;
    setIsLoading(true);
    await fetchTenant();
  };

  const isMainSite = !getTenantSlugFromCookie() && !getTenantSlugFromHostname();

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

// Transform database row to Tenant type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTenantData(data: any): Tenant {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: data.logo_url,
    primary_color: data.primary_color || "#C53030",
    custom_domain: data.custom_domain,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: (data.settings as Record<string, any>) || {},
    subscription_tier: data.subscription_tier as Tenant["subscription_tier"],
    subscription_status: data.subscription_status as Tenant["subscription_status"],
    trial_ends_at: data.trial_ends_at,
    agency_code: data.agency_code || null,
    white_label_enabled: data.white_label_enabled || false,
    tenant_type: (data.tenant_type as Tenant["tenant_type"]) || "education",
  };
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
    pro: { instructors: 5, students: 25, courses: -1, storage: 25 },
    professional: { instructors: 5, students: 25, courses: -1, storage: 25 },
    institution: { instructors: -1, students: 100, courses: -1, storage: 100 },
    enterprise: { instructors: -1, students: -1, courses: -1, storage: -1 },
    "agency-starter": { instructors: 2, students: 50, courses: -1, storage: 10 },
    "agency-pro": { instructors: 5, students: 150, courses: -1, storage: 50 },
    "agency-enterprise": { instructors: -1, students: -1, courses: -1, storage: -1 },
  };

  const tier = tenant?.subscription_tier || "professional";
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

// useLayoutEffect on client, useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Load cached branding from localStorage for instant display on hard refresh
function loadCachedBranding(): {
  primaryColor: string;
  logoUrl: string | null;
  tenantName: string;
  whiteLabel: boolean;
  hideVendorBranding: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("tenant_branding_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache valid for 24 hours
      if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveCachedBranding(tenant: Tenant) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tenant_branding_cache", JSON.stringify({
      primaryColor: tenant.primary_color,
      logoUrl: tenant.logo_url,
      tenantName: tenant.name,
      whiteLabel: !!tenant.logo_url,
      hideVendorBranding: tenant.white_label_enabled || false,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

function clearCachedBranding() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("tenant_branding_cache");
  } catch {
    // Ignore storage errors
  }
}

// Hook to apply tenant branding
export function useTenantBranding() {
  const { tenant, isMainSite } = useTenant();

  // Apply cached branding BEFORE paint so hard refresh doesn't flash default colors
  useIsomorphicLayoutEffect(() => {
    if (isMainSite) return;
    // If tenant is already loaded, it will be applied in the useEffect below.
    // This only bridges the gap on hard refresh before tenant query resolves.
    if (!tenant) {
      const cached = loadCachedBranding();
      if (cached?.primaryColor) {
        document.documentElement.style.setProperty("--primary", cached.primaryColor);
        document.documentElement.style.setProperty("--ring", cached.primaryColor);
      }
    }
  }, [isMainSite, tenant]);

  useEffect(() => {
    if (tenant?.primary_color && !isMainSite) {
      // Apply tenant's primary color as CSS variable
      document.documentElement.style.setProperty("--primary", tenant.primary_color);
      document.documentElement.style.setProperty("--ring", tenant.primary_color);
      // Cache for next hard refresh
      saveCachedBranding(tenant);
    }

    if (isMainSite) {
      // Main site — clear any stale tenant branding
      clearCachedBranding();
    }

    return () => {
      // Reset to default when unmounting or leaving tenant site
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    };
  }, [tenant?.primary_color, isMainSite]);

  // Use cached branding as fallback while tenant loads
  const cached = typeof window !== "undefined" && !tenant && !isMainSite ? loadCachedBranding() : null;

  return {
    logoUrl: tenant?.logo_url || cached?.logoUrl || "/logo.svg",
    primaryColor: tenant?.primary_color || cached?.primaryColor || "#C53030",
    tenantName: tenant?.name || cached?.tenantName || "MedicForge",
    isWhiteLabeled: !!tenant?.logo_url || cached?.whiteLabel || false,
    hideVendorBranding: tenant?.white_label_enabled || cached?.hideVendorBranding || false,
  };
}

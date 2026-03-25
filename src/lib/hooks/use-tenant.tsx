"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
}

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
      let tenantId = getTenantIdFromCookie();
      let tenantSlug = getTenantSlugFromCookie();

      // STRATEGY 2: If no cookie, try to get slug from hostname
      if (!tenantId && !tenantSlug) {
        tenantSlug = getTenantSlugFromHostname();
      }

      // STRATEGY 3: If we have a slug but no ID, query by slug (fast, single query)
      if (!tenantId && tenantSlug) {
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
      const { data: isPlatformAdmin } = await (supabase as any).rpc("is_platform_admin");
      if (isPlatformAdmin) {
        finalize(null);
        return;
      }

      // Get user's tenant_id from their profile
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
          console.log("User changed via tenant auth event, clearing tenant cache");
          clearTenantCache();
          fetchAttemptedRef.current = false;
          fetchTenant();
        } else if (!cachedTenant && !tenantInitialized) {
          // Only re-fetch if we don't have a tenant AND haven't finished initializing yet.
          // This prevents re-fetching on every TOKEN_REFRESHED for main-site users (no tenant).
          fetchAttemptedRef.current = false;
          fetchTenant();
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
function transformTenantData(data: any): Tenant {
  return {
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

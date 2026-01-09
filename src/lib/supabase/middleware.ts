import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

// Domains that should show the main marketing site (no tenant)
const MAIN_DOMAINS = ["www.medicforge.net", "medicforge.net", "localhost", "localhost:3000"];

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, just pass through
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get("host") || "";

  // ============================================
  // MULTI-TENANT SUBDOMAIN DETECTION
  // ============================================

  let tenantSlug: string | null = null;
  let tenantInfo: TenantInfo | null = null;

  // Check if this is the main marketing domain
  const isMainDomain = MAIN_DOMAINS.some(domain =>
    hostname === domain || hostname.startsWith("localhost")
  );

  if (!isMainDomain) {
    // Check for custom domain first
    const customDomainTenant = await lookupTenantByCustomDomain(supabase, hostname);
    if (customDomainTenant) {
      tenantInfo = customDomainTenant;
      tenantSlug = customDomainTenant.slug;
    } else {
      // Extract subdomain from hostname (e.g., "metro-ems" from "metro-ems.medicforge.net")
      const parts = hostname.split(".");
      if (parts.length >= 3 || (parts.length === 2 && parts[1].includes("localhost"))) {
        const potentialSlug = parts[0];
        // Don't treat "www" as a tenant slug
        if (potentialSlug !== "www") {
          tenantSlug = potentialSlug;
        }
      }
    }

    // Look up tenant by slug if we found one
    if (tenantSlug && !tenantInfo) {
      tenantInfo = await lookupTenantBySlug(supabase, tenantSlug);
    }

    // If we have a subdomain but no tenant found, redirect to main site
    if (tenantSlug && !tenantInfo) {
      const mainUrl = new URL(request.url);
      mainUrl.host = "www.medicforge.net";
      return NextResponse.redirect(mainUrl);
    }

    // Set tenant info in response headers/cookies for the app to use
    if (tenantInfo) {
      supabaseResponse.headers.set("x-tenant-id", tenantInfo.id);
      supabaseResponse.headers.set("x-tenant-slug", tenantInfo.slug);
      supabaseResponse.cookies.set("tenant_id", tenantInfo.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      supabaseResponse.cookies.set("tenant_slug", tenantInfo.slug, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
  }

  // ============================================
  // ROUTE PROTECTION (existing logic)
  // ============================================

  // Skip auth check for public routes (faster response - no network calls)
  const isPublicRoute = pathname === "/" ||
                        pathname.startsWith("/features") ||
                        pathname.startsWith("/pricing") ||
                        pathname.startsWith("/about") ||
                        pathname.startsWith("/contact") ||
                        pathname.startsWith("/blog") ||
                        pathname.startsWith("/docs") ||
                        pathname.startsWith("/guides") ||
                        pathname.startsWith("/privacy") ||
                        pathname.startsWith("/terms") ||
                        pathname.startsWith("/security") ||
                        pathname.startsWith("/support") ||
                        pathname.startsWith("/careers") ||
                        pathname.startsWith("/partners") ||
                        pathname.startsWith("/integrations") ||
                        pathname.startsWith("/changelog");

  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Route type detection - check BEFORE making network call
  const isAuthRoute = pathname.startsWith("/login") ||
                      pathname.startsWith("/register") ||
                      pathname.startsWith("/forgot-password") ||
                      pathname.startsWith("/demo");

  const isPlatformAdminRoute = pathname.startsWith("/platform-admin") &&
                               pathname !== "/platform-admin";

  const isProtectedRoute = pathname.startsWith("/admin") ||
                           pathname.startsWith("/instructor") ||
                           pathname.startsWith("/student");

  // For auth routes, only check user if cookies suggest they might be logged in
  if (isAuthRoute) {
    // Quick check: if no auth cookies exist, user is definitely not logged in
    // Skip the network call entirely for faster page loads
    const hasAuthCookies = request.cookies.getAll().some(
      cookie => cookie.name.includes("supabase") || cookie.name.includes("sb-")
    );

    if (!hasAuthCookies) {
      // No auth cookies = not logged in, allow through immediately
      return supabaseResponse;
    }

    // Has cookies, need to verify if actually logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User is logged in, redirect to dashboard
        const url = request.nextUrl.clone();
        url.pathname = "/student/dashboard";
        return NextResponse.redirect(url);
      }
    } catch {
      // If auth check fails, just let them through to the auth page
    }
    return supabaseResponse;
  }

  // Protected routes - require login
  if (isProtectedRoute || isPlatformAdminRoute) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
    } catch {
      // If auth check fails, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

// ============================================
// TENANT LOOKUP HELPERS
// ============================================

async function lookupTenantBySlug(
  supabase: ReturnType<typeof createServerClient<Database>>,
  slug: string
): Promise<TenantInfo | null> {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, logo_url, primary_color, custom_domain")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      primary_color: data.primary_color || "#C53030",
      custom_domain: data.custom_domain,
    };
  } catch {
    return null;
  }
}

async function lookupTenantByCustomDomain(
  supabase: ReturnType<typeof createServerClient<Database>>,
  domain: string
): Promise<TenantInfo | null> {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, logo_url, primary_color, custom_domain")
      .eq("custom_domain", domain)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      primary_color: data.primary_color || "#C53030",
      custom_domain: data.custom_domain,
    };
  } catch {
    return null;
  }
}

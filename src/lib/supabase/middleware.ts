import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"

// Domains that should show the main marketing site (no tenant)
const MAIN_DOMAINS = ["www.medicforge.net", "medicforge.net", "localhost", "localhost:3000"]

interface TenantInfo {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  custom_domain: string | null
  tenant_type: "education" | "agency" | "combined"
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured, just pass through
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get("host") || ""

  // ============================================
  // MULTI-TENANT SUBDOMAIN DETECTION
  // ============================================

  let tenantSlug: string | null = null
  let tenantInfo: TenantInfo | null = null

  // Check if this is the main marketing domain
  const isMainDomain = MAIN_DOMAINS.some(domain =>
    hostname === domain || hostname.startsWith("localhost")
  )

  if (!isMainDomain) {
    // Check for custom domain first
    const customDomainTenant = await lookupTenantByCustomDomain(supabase, hostname)
    if (customDomainTenant) {
      tenantInfo = customDomainTenant
      tenantSlug = customDomainTenant.slug
    } else {
      // Extract subdomain from hostname (e.g., "metro-ems" from "metro-ems.medicforge.net")
      const parts = hostname.split(".")
      if (parts.length >= 3 || (parts.length === 2 && parts[1].includes("localhost"))) {
        const potentialSlug = parts[0]
        // Don't treat "www" as a tenant slug
        if (potentialSlug !== "www") {
          tenantSlug = potentialSlug
        }
      }
    }

    // Look up tenant by slug if we found one
    if (tenantSlug && !tenantInfo) {
      tenantInfo = await lookupTenantBySlug(supabase, tenantSlug)
    }

    // If we have a subdomain but no tenant found, redirect to main site
    if (tenantSlug && !tenantInfo) {
      const mainUrl = new URL(request.url)
      mainUrl.host = "www.medicforge.net"
      return NextResponse.redirect(mainUrl)
    }

    // Set tenant info in response headers/cookies for the app to use
    if (tenantInfo) {
      supabaseResponse.headers.set("x-tenant-id", tenantInfo.id)
      supabaseResponse.headers.set("x-tenant-slug", tenantInfo.slug)
      supabaseResponse.cookies.set("tenant_id", tenantInfo.id, {
        httpOnly: false, // Must be false so client-side JS can read it
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
      supabaseResponse.cookies.set("tenant_slug", tenantInfo.slug, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
    }
  }

  // ============================================
  // ROUTE PROTECTION (existing logic)
  // ============================================

  // Skip auth check for public routes (faster response - no network calls)
  // BUT only on the main marketing domain - subdomains should NOT show marketing pages
  const isMarketingRoute = pathname === "/" ||
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
                        pathname.startsWith("/changelog")

  // On subdomains, redirect marketing routes to login
  if (!isMainDomain && isMarketingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isMarketingRoute) {
    return supabaseResponse
  }

  // Route type detection - check BEFORE making network call
  const isAuthRoute = pathname.startsWith("/login") ||
                      pathname.startsWith("/register") ||
                      pathname.startsWith("/forgot-password");
                      

  const isPlatformAdminRoute = pathname.startsWith("/platform-admin") &&
                               pathname !== "/platform-admin"

  const isProtectedRoute = pathname.startsWith("/admin") ||
                           pathname.startsWith("/instructor") ||
                           pathname.startsWith("/student")

  const isAgencyRoute = pathname.startsWith("/agency") &&
                        !pathname.startsWith("/agency/register")

  const isLMSRoute = pathname.startsWith("/admin") ||
                     pathname.startsWith("/instructor") ||
                     pathname.startsWith("/student")

  // ============================================
  // TENANT TYPE-BASED ROUTING
  // ============================================

  // If we have tenant info, enforce tenant-type routing
  if (tenantInfo) {
    const tenantType = tenantInfo.tenant_type

    // Agency tenants cannot access LMS routes
    if (tenantType === "agency" && isLMSRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/agency/dashboard"
      return NextResponse.redirect(url)
    }

    // Education tenants cannot access standalone agency routes
    if (tenantType === "education" && isAgencyRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // For auth routes, allow users to access them freely
  // They might want to switch accounts or log in as a different user
  if (isAuthRoute) {
    // Platform admin login page - always allow
    if (pathname === "/platform-admin" || pathname.startsWith("/platform-admin/login")) {
      return supabaseResponse
    }

    // For login/register pages, allow users through
    // The login page will handle signing out stale sessions before new login
    if (pathname === "/login" || pathname === "/register") {
      return supabaseResponse
    }

    // For other auth routes (like forgot-password), check if logged in
    const hasAuthCookies = request.cookies.getAll().some(
      cookie => cookie.name.includes("supabase") || cookie.name.includes("sb-")
    )

    if (!hasAuthCookies) {
      return supabaseResponse
    }

    // Has cookies, need to verify if actually logged in
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // First check if user is a platform admin using RPC function (bypasses RLS)
        const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin")

        if (isPlatformAdmin) {
          // User is a platform admin - redirect to platform admin dashboard
          const url = request.nextUrl.clone()
          url.pathname = "/platform-admin/dashboard"
          return NextResponse.redirect(url)
        }

        // Not a platform admin, check their role in users table
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()

        // Only redirect if we have a profile with a role
        if (profile?.role) {
          const url = request.nextUrl.clone()
          if (profile.role === "student") {
            url.pathname = "/student/dashboard"
          } else {
            url.pathname = "/instructor/dashboard"
          }
          return NextResponse.redirect(url)
        }
        // No profile yet - let them through (they might be in the middle of setup)
      }
    } catch {
      // If auth check fails, just let them through to the auth page
    }
    return supabaseResponse
  }

  // Block protected app routes on the main marketing domain
  // These routes should only be accessible via tenant subdomains
  if (isMainDomain && isProtectedRoute) {
    // Redirect to the marketing home page or login
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Protected routes - require login
  if (isProtectedRoute || isPlatformAdminRoute || isAgencyRoute) {
    try {
      // First, try to refresh the session - this handles expired access tokens
      // getUser() will automatically use refresh token if access token is expired
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        // Check if we have a session that might need refreshing
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // No session at all, redirect to login
          const url = request.nextUrl.clone()
          url.pathname = "/login"
          url.searchParams.set("redirect", pathname)
          return NextResponse.redirect(url)
        }

        // We have a session but getUser failed - try to refresh explicitly
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          // Refresh failed, session is truly expired
          const url = request.nextUrl.clone()
          url.pathname = "/login"
          url.searchParams.set("redirect", pathname)
          return NextResponse.redirect(url)
        }
      }
    } catch {
      // If auth check fails, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  return supabaseResponse
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
      .select("id, name, slug, logo_url, primary_color, custom_domain, tenant_type")
      .eq("slug", slug)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      primary_color: data.primary_color || "#C53030",
      custom_domain: data.custom_domain,
      tenant_type: (data.tenant_type as TenantInfo["tenant_type"]) || "education",
    }
  } catch {
    return null
  }
}

async function lookupTenantByCustomDomain(
  supabase: ReturnType<typeof createServerClient<Database>>,
  domain: string
): Promise<TenantInfo | null> {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, logo_url, primary_color, custom_domain, tenant_type")
      .eq("custom_domain", domain)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      primary_color: data.primary_color || "#C53030",
      custom_domain: data.custom_domain,
      tenant_type: (data.tenant_type as TenantInfo["tenant_type"]) || "education",
    }
  } catch {
    return null
  }
}

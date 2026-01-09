import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

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

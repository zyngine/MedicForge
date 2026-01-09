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

  // Skip auth check for public routes (faster response)
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

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route type detection
  const isAuthRoute = pathname.startsWith("/login") ||
                      pathname.startsWith("/register") ||
                      pathname.startsWith("/forgot-password") ||
                      pathname.startsWith("/demo");

  const isPlatformAdminRoute = pathname.startsWith("/platform-admin") &&
                               pathname !== "/platform-admin";

  const isProtectedRoute = pathname.startsWith("/admin") ||
                           pathname.startsWith("/instructor") ||
                           pathname.startsWith("/student");

  // Auth routes - allow if not logged in
  if (isAuthRoute) {
    if (user) {
      // User is logged in, redirect to dashboard
      // Just redirect to student dashboard, the page can handle role-based routing
      const url = request.nextUrl.clone();
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }
    // Not logged in, allow access to auth routes
    return supabaseResponse;
  }

  // Protected routes - require login
  if (isProtectedRoute || isPlatformAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // User is logged in, allow access (role checking is done in the pages)
    return supabaseResponse;
  }

  return supabaseResponse;
}

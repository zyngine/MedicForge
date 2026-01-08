import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes
  const isAuthRoute = pathname.startsWith("/login") ||
                      pathname.startsWith("/register") ||
                      pathname.startsWith("/forgot-password");

  const isProtectedRoute = pathname.startsWith("/admin") ||
                           pathname.startsWith("/instructor") ||
                           pathname.startsWith("/student");

  const isInstructorRoute = pathname.startsWith("/instructor");
  const isStudentRoute = pathname.startsWith("/student");
  const isAdminRoute = pathname.startsWith("/admin");

  // If user is not logged in and trying to access protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in, check role-based access
  if (user && isProtectedRoute) {
    // Get user profile with role
    const { data: profile } = await supabase
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile) {
      const userRole = profile.role;

      // Students can't access instructor/admin routes
      if (userRole === "student" && (isInstructorRoute || isAdminRoute)) {
        const url = request.nextUrl.clone();
        url.pathname = "/student/dashboard";
        return NextResponse.redirect(url);
      }

      // Instructors can't access admin routes (but can access instructor routes)
      if (userRole === "instructor" && isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/instructor/dashboard";
        return NextResponse.redirect(url);
      }

      // Admins and instructors shouldn't access student-only routes
      if ((userRole === "admin" || userRole === "instructor") && isStudentRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/instructor/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  // If user is logged in and trying to access auth routes, redirect to appropriate dashboard
  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile?.role === "student") {
      url.pathname = "/student/dashboard";
    } else {
      url.pathname = "/instructor/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

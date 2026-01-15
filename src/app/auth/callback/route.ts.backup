import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Use admin client to bypass RLS for database operations
      const adminClient = createAdminClient();

      // Check if user profile exists, if not create it
      const { data: existingUser } = await adminClient
        .from("users")
        .select("id, role, tenant_id")
        .eq("id", data.user.id)
        .single();

      if (!existingUser) {
        // Get user metadata from signup
        const metadata = data.user.user_metadata;
        const registrationType = metadata?.registration_type;
        const fullName = metadata?.full_name || data.user.email?.split("@")[0] || "User";

        if (registrationType === "organization") {
          // Create new tenant and user as admin
          const organizationName = metadata?.organization_name || "My Organization";
          const slug = organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 50) + "-" + Date.now().toString(36);

          // Create tenant
          const { data: tenant, error: tenantError } = await adminClient
            .from("tenants")
            .insert({
              name: organizationName,
              slug: slug,
            })
            .select()
            .single();

          if (tenantError) {
            console.error("Error creating tenant:", tenantError);
            return NextResponse.redirect(`${origin}/login?error=Failed to create organization`);
          }

          // Create user as admin
          const { error: userError } = await adminClient.from("users").insert({
            id: data.user.id,
            tenant_id: tenant.id,
            email: data.user.email!,
            full_name: fullName,
            role: "admin",
          });

          if (userError) {
            console.error("Error creating user:", userError);
            return NextResponse.redirect(`${origin}/login?error=Failed to create user profile`);
          }

          // Redirect to admin dashboard
          return NextResponse.redirect(`${origin}/instructor/dashboard`);
        } else if (registrationType === "student") {
          // Find course by enrollment code and join
          const enrollmentCode = metadata?.enrollment_code;

          if (enrollmentCode) {
            const { data: course, error: courseError } = await adminClient
              .from("courses")
              .select("id, tenant_id")
              .eq("enrollment_code", enrollmentCode)
              .single();

            if (courseError || !course) {
              return NextResponse.redirect(`${origin}/login?error=Invalid enrollment code`);
            }

            // Create user as student in that tenant
            const { error: userError } = await adminClient.from("users").insert({
              id: data.user.id,
              tenant_id: course.tenant_id,
              email: data.user.email!,
              full_name: fullName,
              role: "student",
            });

            if (userError) {
              console.error("Error creating user:", userError);
              return NextResponse.redirect(`${origin}/login?error=Failed to create user profile`);
            }

            // Enroll in course
            await adminClient.from("enrollments").insert({
              tenant_id: course.tenant_id,
              course_id: course.id,
              student_id: data.user.id,
            });

            // Redirect to student dashboard
            return NextResponse.redirect(`${origin}/student/dashboard`);
          }
        }
      } else {
        // User exists, redirect based on role
        if (existingUser.role === "student") {
          return NextResponse.redirect(`${origin}/student/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/instructor/dashboard`);
        }
      }

      // Default redirect
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return error if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}

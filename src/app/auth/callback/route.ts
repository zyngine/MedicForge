import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Generate a unique 8-character agency code
function generateAgencyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[Auth Callback] ========== START ==========");
  console.log("[Auth Callback] Timestamp:", new Date().toISOString());
  console.log("[Auth Callback] Code present:", !!code);

  if (code) {
    const supabase = await createClient();
    console.log("[Auth Callback] Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[Auth Callback] Session exchange result:", { hasData: !!data, hasUser: !!data?.user, error: error?.message });

    if (!error && data.user) {
      console.log("[Auth Callback] User authenticated:", {
        id: data.user.id,
        email: data.user.email,
        raw_user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
      });

      // Use admin client to bypass RLS for database operations
      const adminClient = createAdminClient();

      // Check if user profile exists, if not create it
      const { data: existingUser, error: existingUserError } = await adminClient
        .from("users")
        .select("id, role, tenant_id")
        .eq("id", data.user.id)
        .single();

      console.log("[Auth Callback] Existing user check:", {
        found: !!existingUser,
        existingUser,
        error: existingUserError?.message
      });

      if (!existingUser) {
        // Get user metadata from signup
        const metadata = data.user.user_metadata;
        const registrationType = metadata?.registration_type as string | undefined;
        const fullName = metadata?.full_name || data.user.email?.split("@")[0] || "User";

        console.log("[Auth Callback] New user registration:", {
          userId: data.user.id,
          email: data.user.email,
          registrationType,
          metadata,
        });

        if (registrationType === "organization") {
          // Create new tenant and user as admin
          const organizationName = metadata?.organization_name || "My Organization";
          const slug = organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 50) + "-" + Date.now().toString(36);

          // Generate unique agency code for instructors to join
          const agencyCode = generateAgencyCode();

          // Create tenant
          const { data: tenant, error: tenantError } = await adminClient
            .from("tenants")
            .insert({
              name: organizationName,
              slug: slug,
              agency_code: agencyCode,
            })
            .select()
            .single();

          if (tenantError) {
            console.error("[Auth Callback] Error creating tenant:", tenantError);
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
            console.error("[Auth Callback] Error creating admin user:", userError);
            return NextResponse.redirect(`${origin}/login?error=Failed to create user profile`);
          }

          console.log("[Auth Callback] Created organization and admin user:", {
            tenantId: tenant.id,
            userId: data.user.id,
          });

          // Redirect to admin dashboard
          return NextResponse.redirect(`${origin}/instructor/dashboard`);

        } else if (registrationType === "instructor") {
          // Find tenant by agency code and join as instructor
          const agencyCode = metadata?.agency_code as string | undefined;

          if (!agencyCode) {
            console.error("[Auth Callback] Instructor registration missing agency code");
            return NextResponse.redirect(`${origin}/login?error=Agency code is required`);
          }

          const { data: tenant, error: tenantError } = await adminClient
            .from("tenants")
            .select("id")
            .eq("agency_code", agencyCode.toUpperCase())
            .single();

          if (tenantError || !tenant) {
            console.error("[Auth Callback] Invalid agency code:", agencyCode, tenantError);
            return NextResponse.redirect(`${origin}/login?error=Invalid agency code`);
          }

          // Create user as instructor in that tenant
          const { error: userError } = await adminClient.from("users").insert({
            id: data.user.id,
            tenant_id: tenant.id,
            email: data.user.email!,
            full_name: fullName,
            role: "instructor",
          });

          if (userError) {
            console.error("[Auth Callback] Error creating instructor user:", userError);
            return NextResponse.redirect(`${origin}/login?error=Failed to create user profile`);
          }

          console.log("[Auth Callback] Created instructor user:", {
            tenantId: tenant.id,
            userId: data.user.id,
          });

          // Redirect to instructor dashboard
          return NextResponse.redirect(`${origin}/instructor/dashboard`);

        } else if (registrationType === "student") {
          // Find course by enrollment code and join
          const enrollmentCode = metadata?.enrollment_code as string | undefined;

          if (!enrollmentCode) {
            console.error("[Auth Callback] Student registration missing enrollment code");
            return NextResponse.redirect(`${origin}/login?error=Enrollment code is required`);
          }

          console.log("[Auth Callback] Looking up course with enrollment code:", enrollmentCode.toUpperCase());

          // Query course - use eq with uppercase for exact match
          const { data: course, error: courseError } = await adminClient
            .from("courses")
            .select("id, tenant_id, title")
            .eq("enrollment_code", enrollmentCode.toUpperCase())
            .single();

          if (courseError) {
            console.error("[Auth Callback] Course lookup error:", courseError);
            return NextResponse.redirect(`${origin}/login?error=Invalid enrollment code - course not found`);
          }

          if (!course) {
            console.error("[Auth Callback] No course found for enrollment code:", enrollmentCode);
            return NextResponse.redirect(`${origin}/login?error=Invalid enrollment code`);
          }

          console.log("[Auth Callback] Found course:", {
            courseId: course.id,
            courseTitle: course.title,
            tenantId: course.tenant_id,
          });

          // Create user as student in that tenant
          const { error: userError } = await adminClient.from("users").insert({
            id: data.user.id,
            tenant_id: course.tenant_id,
            email: data.user.email!,
            full_name: fullName,
            role: "student",
          });

          if (userError) {
            console.error("[Auth Callback] Error creating student user:", userError);
            return NextResponse.redirect(`${origin}/login?error=Failed to create user profile`);
          }

          // Enroll in course
          const { error: enrollError } = await adminClient.from("enrollments").insert({
            tenant_id: course.tenant_id,
            course_id: course.id,
            student_id: data.user.id,
          });

          if (enrollError) {
            console.error("[Auth Callback] Error creating enrollment:", enrollError);
            // User was created but enrollment failed - still redirect to dashboard
          }

          console.log("[Auth Callback] Created student user and enrollment:", {
            userId: data.user.id,
            courseId: course.id,
            tenantId: course.tenant_id,
          });

          // Redirect to student dashboard
          return NextResponse.redirect(`${origin}/student/dashboard`);

        } else {
          // Unknown registration type - this shouldn't happen
          console.error("[Auth Callback] Unknown registration type:", registrationType, "Full metadata:", metadata);
          return NextResponse.redirect(`${origin}/login?error=Invalid registration type. Please register again.`);
        }
      } else {
        // User exists, redirect based on role
        console.log("[Auth Callback] Existing user login:", {
          userId: existingUser.id,
          role: existingUser.role,
          tenantId: existingUser.tenant_id,
        });

        if (existingUser.role === "student") {
          return NextResponse.redirect(`${origin}/student/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/instructor/dashboard`);
        }
      }
    } else {
      console.error("[Auth Callback] Session exchange failed:", error);
    }
  }

  // Return error if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}

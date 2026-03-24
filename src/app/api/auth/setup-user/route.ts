import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate a unique 8-character agency code
function generateAgencyCode(): string {
  const bytes = crypto.randomBytes(5);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i % bytes.length] % chars.length);
  }
  return code;
}

export async function POST(request: Request) {
  console.log("[Setup User] ========== START ==========");

  try {
    // Authenticate the requesting user
    const supabase = await createServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, metadata } = body;

    console.log("[Setup User] Request:", { userId, email, metadata });

    // The authenticated user must be setting up their own account
    if (userId !== authUser.id) {
      return NextResponse.json({ error: "Forbidden - can only set up your own account" }, { status: 403 });
    }

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id, role, tenant_id")
      .eq("id", userId)
      .single();

    if (existingUser) {
      console.log("[Setup User] User already exists:", existingUser);
      return NextResponse.json({
        success: true,
        role: existingUser.role,
        message: "User already exists"
      });
    }

    // New user - create based on registration type
    const registrationType = metadata?.registration_type as string | undefined;
    const fullName = metadata?.full_name || email.split("@")[0] || "User";

    console.log("[Setup User] Creating new user:", { registrationType, fullName });

    if (registrationType === "organization") {
      const organizationName = metadata?.organization_name || "My Organization";
      const slug =
        organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 50) +
        "-" +
        Date.now().toString(36);

      const agencyCode = generateAgencyCode();

      console.log("[Setup User] Creating organization:", { organizationName, slug });

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
        console.error("[Setup User] Error creating tenant:", tenantError);
        return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
      }

      const { error: userError } = await adminClient.from("users").insert({
        id: userId,
        tenant_id: tenant.id,
        email: email,
        full_name: fullName,
        role: "admin",
      });

      if (userError) {
        console.error("[Setup User] Error creating admin user:", userError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }

      console.log("[Setup User] Created organization and admin user");
      return NextResponse.json({ success: true, role: "admin" });

    } else if (registrationType === "instructor") {
      const agencyCode = metadata?.agency_code as string | undefined;

      if (!agencyCode) {
        return NextResponse.json({ error: "Agency code is required" }, { status: 400 });
      }

      const { data: tenant, error: tenantError } = await adminClient
        .from("tenants")
        .select("id")
        .eq("agency_code", agencyCode.toUpperCase())
        .single();

      if (tenantError || !tenant) {
        console.error("[Setup User] Invalid agency code:", agencyCode);
        return NextResponse.json({ error: "Invalid agency code" }, { status: 400 });
      }

      const { error: userError } = await adminClient.from("users").insert({
        id: userId,
        tenant_id: tenant.id,
        email: email,
        full_name: fullName,
        role: "instructor",
      });

      if (userError) {
        console.error("[Setup User] Error creating instructor:", userError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }

      console.log("[Setup User] Created instructor user");
      return NextResponse.json({ success: true, role: "instructor" });

    } else if (registrationType === "student") {
      const enrollmentCode = metadata?.enrollment_code as string | undefined;

      if (!enrollmentCode) {
        return NextResponse.json({ error: "Enrollment code is required" }, { status: 400 });
      }

      console.log("[Setup User] Looking up course:", enrollmentCode.toUpperCase());

      const { data: course, error: courseError } = await adminClient
        .from("courses")
        .select("id, tenant_id, title")
        .eq("enrollment_code", enrollmentCode.toUpperCase())
        .single();

      if (courseError || !course) {
        console.error("[Setup User] Course lookup error:", courseError);
        return NextResponse.json({ error: "Invalid enrollment code - course not found" }, { status: 400 });
      }

      console.log("[Setup User] Found course:", course);

      const { error: userError } = await adminClient.from("users").insert({
        id: userId,
        tenant_id: course.tenant_id,
        email: email,
        full_name: fullName,
        role: "student",
      });

      if (userError) {
        console.error("[Setup User] Error creating student:", userError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }

      // Enroll in course
      const { error: enrollError } = await adminClient.from("enrollments").insert({
        tenant_id: course.tenant_id,
        course_id: course.id,
        student_id: userId,
      });

      if (enrollError) {
        console.error("[Setup User] Error creating enrollment:", enrollError);
        // Continue anyway - user was created
      }

      console.log("[Setup User] Created student user and enrollment");
      return NextResponse.json({ success: true, role: "student" });

    } else {
      console.error("[Setup User] Unknown registration type:", registrationType);
      return NextResponse.json({
        error: "Invalid registration type. Please register again.",
        debug: { registrationType, metadata }
      }, { status: 400 });
    }

  } catch (err) {
    console.error("[Setup User] Unhandled error:", err);
    return NextResponse.json({
      error: "Server error",
      message: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}

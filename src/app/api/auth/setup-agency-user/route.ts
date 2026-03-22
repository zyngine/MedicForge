import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function generateAgencyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      agencyName,
      adminName,
      email,
      password,
      stateCode,
      inviteCode, // Optional: for MD registration via invitation
    } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if this is an MD registration via invite
    if (inviteCode) {
      return handleMDRegistration(supabase, {
        email,
        password,
        inviteCode,
        adminName,
      });
    }

    // New agency registration
    if (!agencyName || !adminName) {
      return NextResponse.json(
        { error: "Agency name and admin name are required" },
        { status: 400 }
      );
    }

    // Generate unique slug (use admin client to bypass RLS for slug check)
    let slug = generateSlug(agencyName);
    let slugAttempt = 0;

    while (true) {
      const testSlug = slugAttempt === 0 ? slug : `${slug}-${slugAttempt}`;
      const { data: existing } = await adminClient
        .from("tenants")
        .select("id")
        .eq("slug", testSlug)
        .maybeSingle();

      if (!existing) {
        slug = testSlug;
        break;
      }
      slugAttempt++;
    }

    // 1. Create the auth user via admin client (avoids email confirmation requirement)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
      },
    });

    if (authError || !authData.user) {
      console.error("Auth signup error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create account" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Create the tenant (agency) — admin client bypasses RLS
    // Cast needed: DB has agency tiers but generated types are out of date
    const { data: tenant, error: tenantError } = await (adminClient as any)
      .from("tenants")
      .insert({
        name: agencyName,
        slug,
        tenant_type: "agency",
        subscription_tier: "agency-starter",
        subscription_status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 day trial
        agency_code: generateAgencyCode(),
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create agency" },
        { status: 500 }
      );
    }

    // 3. Create the user profile
    const { error: userError } = await adminClient
      .from("users")
      .insert({
        id: userId,
        email,
        full_name: adminName,
        tenant_id: tenant.id,
        role: "admin",
        agency_role: "agency_admin",
        is_active: true,
      });

    if (userError) {
      console.error("User profile creation error:", userError);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // 4. Create agency settings
    const { error: settingsError } = await adminClient
      .from("agency_settings")
      .insert({
        tenant_id: tenant.id,
        state_code: stateCode || "PA",
      });

    if (settingsError) {
      console.error("Agency settings creation error:", settingsError);
      // Non-critical, don't fail registration
    }

    // 5. Sign the user in so they have a session for the redirect
    await supabase.auth.signInWithPassword({ email, password });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantSlug: slug,
      userId,
      message: "Agency created successfully",
    });
  } catch (error) {
    console.error("Setup agency user error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

async function handleMDRegistration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: {
    email: string;
    password: string;
    inviteCode: string;
    adminName: string;
  }
) {
  const { email, password, inviteCode, adminName } = data;
  const adminClient = createAdminClient();

  // 1. Find the invitation (admin client bypasses RLS)
  const { data: invitation, error: inviteError } = await adminClient
    .from("medical_director_invitations")
    .select("*")
    .eq("invite_code", inviteCode)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Invalid or expired invitation code" },
      { status: 400 }
    );
  }

  // Check email matches invitation
  if (invitation.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: "Email does not match invitation" },
      { status: 400 }
    );
  }

  // 2. Create the auth user via admin client
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: adminName || invitation.md_name,
    },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 3. Create the user profile with medical_director role
  const { error: userError } = await adminClient
    .from("users")
    .insert({
      id: userId,
      email,
      full_name: adminName || invitation.md_name,
      tenant_id: invitation.tenant_id,
      role: "instructor", // MDs get instructor role for viewing purposes
      agency_role: "medical_director",
      is_active: true,
    });

  if (userError) {
    console.error("User profile creation error:", userError);
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Failed to create user profile" },
      { status: 500 }
    );
  }

  // 4. Create MD assignment
  const { error: mdError } = await adminClient
    .from("medical_director_assignments")
    .insert({
      tenant_id: invitation.tenant_id,
      user_id: userId,
      md_name: invitation.md_name,
      md_credentials: invitation.md_credentials,
      md_license_number: invitation.md_license_number,
      md_email: email,
      is_primary: invitation.is_primary,
      is_active: true,
    });

  if (mdError) {
    console.error("MD assignment creation error:", mdError);
    // Non-critical
  }

  // 5. Mark invitation as accepted
  await adminClient
    .from("medical_director_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("id", invitation.id);

  // 6. Get tenant info for redirect
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("slug")
    .eq("id", invitation.tenant_id)
    .single();

  // 7. Sign the user in
  await supabase.auth.signInWithPassword({ email, password });

  return NextResponse.json({
    success: true,
    tenantId: invitation.tenant_id,
    tenantSlug: tenant?.slug,
    userId,
    isMedicalDirector: true,
    message: "Medical Director account created successfully",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { user_id, tenant_id } = await request.json();

    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, tenant_id" },
        { status: 400 }
      );
    }

    // Verify the requesting user is an admin of this tenant
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is admin of this tenant
    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - must be tenant admin" }, { status: 403 });
    }

    // Get the user to resend invite to
    const { data: userToInvite } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role")
      .eq("id", user_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!userToInvite) {
      return NextResponse.json({ error: "User not found in this tenant" }, { status: 404 });
    }

    // Get tenant info for redirect URL
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("slug, custom_domain")
      .eq("id", tenant_id)
      .single();

    // Build redirect URL using tenant's subdomain or custom domain
    let redirectUrl: string;
    if (tenant?.custom_domain) {
      redirectUrl = `https://${tenant.custom_domain}/auth/callback`;
    } else if (tenant?.slug) {
      redirectUrl = `https://${tenant.slug}.medicforge.net/auth/callback`;
    } else {
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.medicforge.net'}/auth/callback`;
    }

    // Check if user has ever confirmed their email (logged in)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (authUser?.user?.email_confirmed_at) {
      // User has already confirmed their email - they can just use "forgot password"
      return NextResponse.json({
        success: false,
        error: "User has already accepted a previous invitation. They can use 'Forgot Password' to reset their password.",
        already_confirmed: true,
      }, { status: 400 });
    }

    // Generate a new invite for this user
    // We need to delete and recreate the auth user to send a fresh invite
    // First, delete the existing auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("Failed to delete auth user for reinvite:", deleteError);
      return NextResponse.json(
        { error: "Failed to prepare new invitation" },
        { status: 500 }
      );
    }

    // Create new auth user with invite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      userToInvite.email,
      {
        data: {
          full_name: userToInvite.full_name,
          role: userToInvite.role,
          tenant_id: tenant_id,
        },
        redirectTo: redirectUrl,
      }
    );

    if (inviteError) {
      console.error("Reinvite error:", inviteError);
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      );
    }

    if (!inviteData.user) {
      return NextResponse.json(
        { error: "Failed to create new invitation" },
        { status: 500 }
      );
    }

    // Update the users table with the new auth user ID
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ id: inviteData.user.id })
      .eq("id", user_id)
      .eq("tenant_id", tenant_id);

    if (updateError) {
      console.error("Failed to update user ID:", updateError);
      // This is problematic - the old user ID is now invalid
      // Try to clean up
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json(
        { error: "Failed to update user record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
      new_user_id: inviteData.user.id,
    });
  } catch (error) {
    console.error("Resend invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

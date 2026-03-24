import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role, tenant_id } = await request.json();

    if (!email || !full_name || !role || !tenant_id) {
      return NextResponse.json(
        { error: "Missing required fields: email, full_name, role, tenant_id" },
        { status: 400 }
      );
    }

    // Verify the requesting user is an admin of this tenant
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin: any = createAdminClient();

    // Check if requester is admin of this tenant
    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - must be tenant admin" }, { status: 403 });
    }

    // Get tenant info for redirect URL
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("slug, custom_domain")
      .eq("id", tenant_id)
      .single();

    // Build redirect URL using tenant's subdomain or custom domain.
    // Must point to /auth/accept-invite so both hash (implicit) and code
    // (PKCE) invite tokens are handled before reaching the server callback.
    let redirectUrl: string;
    if (tenant?.custom_domain) {
      redirectUrl = `https://${tenant.custom_domain}/auth/accept-invite`;
    } else if (tenant?.slug) {
      redirectUrl = `https://${tenant.slug}.medicforge.net/auth/accept-invite`;
    } else {
      // Fallback to main site (shouldn't happen)
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.medicforge.net'}/auth/accept-invite`;
    }

    // Check if user already exists in this tenant
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("tenant_id", tenant_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: `User with email ${email} already exists in this organization` },
        { status: 409 }
      );
    }

    let authUserId: string;
    let inviteLinkUrl: string | undefined;
    let existingAuthUser = false;

    // Try to invite the user — this is fast and handles both new and existing cases
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        role,
        tenant_id,
      },
      redirectTo: redirectUrl,
    });

    if (inviteError) {
      const errorMsg = inviteError.message?.toLowerCase() || "";
      const isRateLimit = errorMsg.includes("rate limit") || (inviteError as any).status === 429;
      const isAlreadyRegistered = errorMsg.includes("already registered") || errorMsg.includes("already been registered");

      if (isAlreadyRegistered) {
        // User exists in auth but not in this tenant — look up their ID
        // Use generateLink which returns the user object without sending an email
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

        if (linkError || !linkData?.user) {
          console.error("generateLink lookup error:", linkError);
          return NextResponse.json(
            { error: "User exists in another organization. Could not look up their account." },
            { status: 500 }
          );
        }

        authUserId = linkData.user.id;
        existingAuthUser = true;
      } else if (isRateLimit) {
        // Email rate limit hit — generate the invite link without sending email.
        // The admin can copy and share the link manually.
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: { full_name, role, tenant_id },
            redirectTo: redirectUrl,
          },
        });

        if (linkError || !linkData?.user) {
          console.error("generateLink error:", linkError);
          return NextResponse.json(
            { error: linkError?.message || "Failed to generate invite link" },
            { status: 500 }
          );
        }

        authUserId = linkData.user.id;
        inviteLinkUrl = linkData.properties.action_link;
      } else {
        console.error("Invite error:", inviteError);
        return NextResponse.json(
          { error: inviteError.message },
          { status: 500 }
        );
      }
    } else {
      if (!inviteData.user) {
        return NextResponse.json(
          { error: "Failed to create user invitation" },
          { status: 500 }
        );
      }
      authUserId = inviteData.user.id;
    }

    // Create user profile in users table
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUserId,
        tenant_id,
        email,
        full_name,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // If user was just invited, we should clean up, but for now just return error
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      invited: !existingAuthUser,
      invite_link: inviteLinkUrl, // present only when email rate limit was hit
    });
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

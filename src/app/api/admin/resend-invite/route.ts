import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendEmail, inviteEmail } from "@/lib/notifications/email-service";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Build redirect URL using tenant's subdomain or custom domain.
    // Must point to /auth/accept-invite so both hash (implicit) and code
    // (PKCE) invite tokens are handled before reaching the server callback.
    let redirectUrl: string;
    if (tenant?.custom_domain) {
      redirectUrl = `https://${tenant.custom_domain}/auth/accept-invite`;
    } else if (tenant?.slug) {
      redirectUrl = `https://${tenant.slug}.medicforge.net/auth/accept-invite`;
    } else {
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.medicforge.net'}/auth/accept-invite`;
    }

    // Check if user has ever confirmed their email (logged in)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (authUser?.user?.email_confirmed_at) {
      return NextResponse.json({
        success: false,
        error: "User already confirmed their email. They can use 'Forgot Password' to reset their password.",
        already_confirmed: true,
      }, { status: 400 });
    }

    // Resend the invitation without deleting the auth user.
    //
    // NOTE: auth.admin.generateLink() only *builds* the action link — Supabase
    // does not send anything for it (unlike inviteUserByEmail). This route used
    // to stop here and return "Invitation resent successfully", so no email was
    // ever delivered. We now send the generated link ourselves through Resend,
    // which also sidesteps Supabase's built-in SMTP rate limit.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: userToInvite.email,
      options: {
        data: {
          full_name: userToInvite.full_name,
          role: userToInvite.role,
          tenant_id: tenant_id,
        },
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("Reinvite error:", linkError);
      return NextResponse.json(
        { error: linkError.message },
        { status: 500 }
      );
    }

    if (!linkData?.user) {
      return NextResponse.json(
        { error: "Failed to generate new invitation link" },
        { status: 500 }
      );
    }

    const inviteLinkUrl: string | undefined = linkData.properties?.action_link;

    if (!inviteLinkUrl) {
      return NextResponse.json(
        { error: "Failed to generate new invitation link" },
        { status: 500 }
      );
    }

    const { data: tenantName } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const emailResult = await sendEmail({
      to: userToInvite.email,
      template: inviteEmail({
        userName: userToInvite.full_name || userToInvite.email,
        organizationName: tenantName?.name,
        inviteUrl: inviteLinkUrl,
        role: userToInvite.role || undefined,
      }),
    });

    if (!emailResult.success) {
      console.error("Resend invite email error:", emailResult.error);
      // Hand the link back so the admin can share it manually rather than
      // reporting a success that never reached the invitee's inbox.
      return NextResponse.json(
        {
          error:
            "Could not send the invitation email. Share this link with the user directly.",
          inviteLink: inviteLinkUrl,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
    });
  } catch (error) {
    console.error("Resend invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

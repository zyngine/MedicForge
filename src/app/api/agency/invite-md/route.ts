import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

function generateInviteCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to check role and tenant
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User not associated with a tenant" },
        { status: 400 }
      );
    }

    // Only agency admins can invite MDs
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json(
        { error: "Only agency administrators can invite Medical Directors" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, mdName, mdCredentials, mdLicenseNumber, isPrimary } = body;

    // Validate required fields
    if (!email || !mdName) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingInvite } = await (supabase as any)
      .from("medical_director_invitations")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email" },
        { status: 400 }
      );
    }

    // Check if user already exists with this email in this tenant
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists in your agency" },
        { status: 400 }
      );
    }

    // Create invitation
    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitation, error: inviteError } = await (supabase as any)
      .from("medical_director_invitations")
      .insert({
        tenant_id: profile.tenant_id,
        email: email.toLowerCase(),
        invite_code: inviteCode,
        md_name: mdName,
        md_credentials: mdCredentials || null,
        md_license_number: mdLicenseNumber || null,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_primary: isPrimary || false,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Get tenant info for the invite link
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug, name")
      .eq("id", profile.tenant_id)
      .single();

    // Build the registration URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";
    const registrationUrl = `${baseUrl}/agency/register?invite=${inviteCode}`;

    // TODO: Send email to the invited MD
    // For now, we'll return the invite details so the admin can share the link

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        mdName: invitation.md_name,
        inviteCode: invitation.invite_code,
        expiresAt: invitation.expires_at,
        registrationUrl,
        tenantName: tenant?.name,
      },
    });
  } catch (error) {
    console.error("Invite MD error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Get all pending invitations for the current tenant
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User not associated with a tenant" },
        { status: 400 }
      );
    }

    // Only agency admins can view invitations
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitations, error } = await (supabase as any)
      .from("medical_director_invitations")
      .select(`
        id,
        email,
        md_name,
        md_credentials,
        md_license_number,
        invite_code,
        expires_at,
        accepted_at,
        is_primary,
        created_at
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Get invitations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete/revoke an invitation
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("medical_director_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      console.error("Error deleting invitation:", error);
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invitation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

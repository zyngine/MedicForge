import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Look up the invitation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitation, error } = await (supabase as any)
      .from("medical_director_invitations")
      .select(`
        id,
        email,
        md_name,
        md_credentials,
        tenant_id,
        expires_at,
        accepted_at,
        is_primary
      `)
      .eq("invite_code", code)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Check if invitation has been accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", invitation.tenant_id)
      .single();

    return NextResponse.json({
      email: invitation.email,
      md_name: invitation.md_name,
      md_credentials: invitation.md_credentials,
      tenant_id: invitation.tenant_id,
      tenant_name: tenant?.name,
      tenant_slug: tenant?.slug,
      is_primary: invitation.is_primary,
      expires_at: invitation.expires_at,
    });
  } catch (error) {
    console.error("Invite lookup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

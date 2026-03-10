import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("[CE Setup User] Creating CE user profile");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      userId,
      email,
      firstName,
      lastName,
      certificationLevel,
      state,
      nremtId,
      registrationType,
      agencyInviteCode,
    } = body;

    // Validate caller — must be the user themselves or a service call with valid userId
    const callerUserId = user?.id || userId;
    if (!callerUserId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminClient = createCEAdminClient();

    // Check if CE user already exists
    const { data: existing } = await adminClient
      .from("ce_users")
      .select("id")
      .eq("id", callerUserId)
      .single();

    if (existing) {
      console.log("[CE Setup User] CE user already exists, skipping");
      return NextResponse.json({ success: true, existing: true });
    }

    let agencyId: string | null = null;

    // Handle agency employee registration
    if (registrationType === "agency_employee" && agencyInviteCode) {
      const { data: inviteCode } = await adminClient
        .from("ce_agency_invite_codes")
        .select("id, agency_id, expires_at, max_uses, uses_count")
        .eq("code", agencyInviteCode)
        .single();

      if (!inviteCode) {
        return NextResponse.json(
          { error: "Invalid agency invite code. Please check with your agency administrator." },
          { status: 400 }
        );
      }

      if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This invite code has expired. Please contact your agency administrator." },
          { status: 400 }
        );
      }

      if (inviteCode.max_uses && inviteCode.uses_count >= inviteCode.max_uses) {
        return NextResponse.json(
          { error: "This invite code has reached its maximum uses. Please contact your agency administrator." },
          { status: 400 }
        );
      }

      agencyId = inviteCode.agency_id;

      // Increment uses_count
      await adminClient
        .from("ce_agency_invite_codes")
        .update({ uses_count: inviteCode.uses_count + 1 })
        .eq("id", inviteCode.id);
    }

    // Create CE user profile
    const { error: insertError } = await adminClient.from("ce_users").insert({
      id: callerUserId,
      email,
      first_name: firstName,
      last_name: lastName,
      certification_level: certificationLevel || null,
      state: state || null,
      nremt_id: nremtId || null,
      agency_id: agencyId,
      role: "user",
      terms_accepted_at: null,
      privacy_accepted_at: null,
    });

    if (insertError) {
      console.error("[CE Setup User] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create CE user profile" },
        { status: 500 }
      );
    }

    console.log("[CE Setup User] CE user created successfully:", callerUserId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CE Setup User] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

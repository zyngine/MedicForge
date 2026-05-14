import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email-ce";
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

    // If there's an active session, use it. Otherwise, fall back to the
    // userId from the request body and verify the user exists in Supabase
    // Auth via the admin client. This is needed when email confirmation is
    // enabled because signUp() does not create a session in that case.
    let callerUserId: string;

    if (user) {
      callerUserId = user.id;
    } else if (userId) {
      const adminAuth = createCEAdminClient();
      const { data: authUser, error: authError } =
        await adminAuth.auth.admin.getUserById(userId);
      if (authError || !authUser?.user) {
        return NextResponse.json(
          { error: "Unauthorized — user not found" },
          { status: 401 }
        );
      }
      callerUserId = authUser.user.id;
    } else {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!email) {
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
      const normalizedCode = agencyInviteCode.trim().toUpperCase();

      const { data: agency } = await adminClient
        .from("ce_agencies")
        .select("id")
        .eq("invite_code", normalizedCode)
        .single();

      if (!agency) {
        return NextResponse.json(
          { error: "Invalid agency invite code. Please check with your agency administrator." },
          { status: 400 }
        );
      }

      agencyId = agency.id;
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

    try {
      await sendWelcomeEmail(email, firstName || "there", callerUserId);
    } catch (e) {
      console.error("[CE Email] Welcome email failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CE Setup User] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { createCEServerClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(`${origin}/ce/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/ce/login`);
  }

  const supabase = await createCEServerClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session || !data.user) {
    return NextResponse.redirect(`${origin}/ce/login?error=${encodeURIComponent(exchangeError?.message || "Email confirmation failed.")}`);
  }

  // Check if ce_users row exists (setup-ce-user was already called at registration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ceUser: any = null;
  const { data: existingCeUser } = await supabase
    .from("ce_users")
    .select("id, terms_accepted_at, role")
    .eq("id", data.user.id)
    .single();

  ceUser = existingCeUser;

  if (!ceUser) {
    // Safety net: create ce_users row from auth metadata if setup-ce-user failed during registration
    try {
      const meta = data.user.user_metadata || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminClient: any = createCEAdminClient();
      const { data: newUser, error: insertErr } = await adminClient.from("ce_users").insert({
        id: data.user.id,
        email: data.user.email,
        first_name: meta.first_name || data.user.email?.split("@")[0] || "User",
        last_name: meta.last_name || "",
        certification_level: meta.certification_level || null,
        state: meta.state || null,
        nremt_id: meta.nremt_id || null,
        role: "user",
      }).select("id, terms_accepted_at, role").single();

      if (insertErr) {
        console.error("[CE Callback] Failed to auto-create ce_users:", insertErr.message);
        return NextResponse.redirect(`${origin}/ce/register?error=no_ce_account`);
      }
      ceUser = newUser;
    } catch (err) {
      console.error("[CE Callback] Auto-create error:", err);
      return NextResponse.redirect(`${origin}/ce/register?error=no_ce_account`);
    }
  }

  // Route by role and terms status
  if (!ceUser.terms_accepted_at) {
    return NextResponse.redirect(`${origin}/ce/terms?redirect=/ce/my-training`);
  }

  if (ceUser.role === "admin") {
    return NextResponse.redirect(`${origin}/ce/admin`);
  }

  if (ceUser.role === "agency_admin") {
    return NextResponse.redirect(`${origin}/ce/agency`);
  }

  return NextResponse.redirect(`${origin}/ce/my-training`);
}

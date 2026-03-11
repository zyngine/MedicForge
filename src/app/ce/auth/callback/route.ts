import { createCEServerClient } from "@/lib/supabase/server";
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
  const { data: ceUser } = await supabase
    .from("ce_users")
    .select("id, terms_accepted_at, role")
    .eq("auth_user_id", data.user.id)
    .single();

  if (!ceUser) {
    // No CE account found — send to register
    return NextResponse.redirect(`${origin}/ce/register?error=no_ce_account`);
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

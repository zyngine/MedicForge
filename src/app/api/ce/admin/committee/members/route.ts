import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getCeAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "admin") return null;
  return { userId: user.id as string };
}

export async function POST(request: Request) {
  const ctx = await getCeAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const {
    name,
    email,
    role = "member",
    credentials,
    employer,
    term_start,
    term_end,
  } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createCEAdminClient();

  // 1. Find or invite the auth user, then ensure ce_users row exists with role='admin'.
  const { data: existing } = await admin
    .from("ce_users")
    .select("id, role, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  let userId: string | null = null;
  let invited = false;

  if (existing) {
    userId = existing.id;
    if (existing.role !== "admin") {
      const { error: roleErr } = await admin
        .from("ce_users")
        .update({ role: "admin" })
        .eq("id", existing.id);
      if (roleErr) {
        return NextResponse.json({ error: `Found existing user but failed to promote: ${roleErr.message}` }, { status: 500 });
      }
    }
  } else {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get("origin") ?? "https://medicforge.net");
    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo: `${baseUrl}/ce/reset-password` },
    );
    if (inviteErr || !invite?.user) {
      return NextResponse.json(
        { error: inviteErr?.message || "Failed to send invitation" },
        { status: 500 },
      );
    }
    userId = invite.user.id;
    invited = true;

    // Pre-create the ce_users row so they have full CE admin access on first login.
    const [first, ...rest] = name.trim().split(/\s+/);
    const { error: ceErr } = await admin.from("ce_users").insert({
      id: userId,
      email: normalizedEmail,
      first_name: first || null,
      last_name: rest.join(" ") || null,
      role: "admin",
    });
    if (ceErr && !`${ceErr.message}`.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: `Failed to create CE user: ${ceErr.message}` }, { status: 500 });
    }
  }

  // 2. Insert the committee member row linked to the user.
  const { data: member, error: memErr } = await admin
    .from("ce_committee_members")
    .insert({
      user_id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role,
      credentials: credentials || null,
      employer: employer || null,
      term_start: term_start || null,
      term_end: term_end || null,
      status: "active",
    })
    .select()
    .single();

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  return NextResponse.json({ member, invited });
}

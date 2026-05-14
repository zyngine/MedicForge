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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCeAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createCEAdminClient();
  const { data: member } = await admin
    .from("ce_committee_members")
    .select("id, user_id, name, email")
    .eq("id", id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (member.user_id) {
    // Already linked — just make sure they have admin role.
    await admin.from("ce_users").update({ role: "admin" }).eq("id", member.user_id);
    return NextResponse.json({ success: true, alreadyLinked: true });
  }

  const normalizedEmail = (member.email as string).trim().toLowerCase();

  // Check whether a ce_users row with this email already exists from another path.
  const { data: existing } = await admin
    .from("ce_users")
    .select("id, role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  let userId: string;
  let invited = false;

  if (existing) {
    userId = existing.id;
    if (existing.role !== "admin") {
      await admin.from("ce_users").update({ role: "admin" }).eq("id", userId);
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
    const [first, ...rest] = (member.name as string).trim().split(/\s+/);
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

  const { error: linkErr } = await admin
    .from("ce_committee_members")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

  return NextResponse.json({ success: true, invited });
}

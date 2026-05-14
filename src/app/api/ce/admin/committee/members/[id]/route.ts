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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCeAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const admin = createCEAdminClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.role === "string") update.role = body.role;
  if ("credentials" in body) update.credentials = body.credentials || null;
  if ("employer" in body) update.employer = body.employer || null;
  if ("term_start" in body) update.term_start = body.term_start || null;
  if ("term_end" in body) update.term_end = body.term_end || null;
  if (typeof body.status === "string") update.status = body.status;

  const { error } = await admin.from("ce_committee_members").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCeAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createCEAdminClient();
  const { data: member } = await admin
    .from("ce_committee_members")
    .select("id, user_id, email")
    .eq("id", id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Demote the linked user back to "user" before deleting the committee row,
  // since the role was granted by virtue of committee membership.
  if (member.user_id) {
    await admin
      .from("ce_users")
      .update({ role: "user" })
      .eq("id", member.user_id);
  }

  const { error } = await admin.from("ce_committee_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

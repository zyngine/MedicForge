import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, role, agency_id")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "agency_admin" || !ce.agency_id) return null;
  return { userId: user.id as string, agencyId: ce.agency_id as string };
}

async function ownsMaterial(materialId: string, agencyId: string) {
  const admin = createCEAdminClient();
  const { data } = await admin
    .from("ce_custom_materials")
    .select("id")
    .eq("id", materialId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  return !!data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await ownsMaterial(id, ctx.agencyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.description === "string" || body.description === null) update.description = body.description;
  const admin = createCEAdminClient();
  const { error } = await admin.from("ce_custom_materials").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await ownsMaterial(id, ctx.agencyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = createCEAdminClient();
  const { error } = await admin.from("ce_custom_materials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createCEAdminClient();
  const { data: m } = await admin
    .from("ce_custom_materials")
    .select("id")
    .eq("id", id)
    .eq("agency_id", ctx.agencyId)
    .maybeSingle();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { pass_threshold, questions } = await request.json();
  const threshold = typeof pass_threshold === "number" ? Math.max(0, Math.min(100, pass_threshold)) : 80;
  const { error } = await admin.from("ce_custom_quizzes").upsert(
    {
      material_id: id,
      pass_threshold: threshold,
      questions: Array.isArray(questions) ? questions : [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "material_id" },
  );
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
  const admin = createCEAdminClient();
  const { data: m } = await admin
    .from("ce_custom_materials")
    .select("id")
    .eq("id", id)
    .eq("agency_id", ctx.agencyId)
    .maybeSingle();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await admin.from("ce_custom_quizzes").delete().eq("material_id", id);
  return NextResponse.json({ success: true });
}

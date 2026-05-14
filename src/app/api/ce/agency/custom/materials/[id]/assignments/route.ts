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

export async function POST(
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

  const body = await request.json();
  const assignments = body.assignments as Array<{ target_type: string; target_value: string | null }>;
  const due_at: string | null = body.due_at || null;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: "No assignments provided" }, { status: 400 });
  }
  for (const a of assignments) {
    if (!["user", "certification", "all_agency"].includes(a.target_type)) {
      return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
    }
  }

  const rows = assignments.map((a) => ({
    material_id: id,
    target_type: a.target_type,
    target_value: a.target_type === "all_agency" ? null : a.target_value,
    assigned_by: ctx.userId,
    due_at,
  }));

  const { error } = await admin.from("ce_custom_assignments").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: rows.length });
}

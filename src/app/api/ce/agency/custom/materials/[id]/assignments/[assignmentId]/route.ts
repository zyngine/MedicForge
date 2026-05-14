import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { id, assignmentId } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: m } = await admin
    .from("ce_custom_materials")
    .select("id")
    .eq("id", id)
    .eq("agency_id", ce.agency_id)
    .maybeSingle();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin.from("ce_custom_assignments").delete().eq("id", assignmentId).eq("material_id", id);
  return NextResponse.json({ success: true });
}

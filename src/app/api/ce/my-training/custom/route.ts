import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface AssignmentRow {
  material_id: string;
  target_type: string;
  target_value: string | null;
}

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  created_at: string;
}

interface CompletionRow {
  material_id: string;
  completed_at: string | null;
}

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, agency_id, certification_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!ce?.agency_id) return NextResponse.json({ materials: [] });

  // Pull all assignments under this agency's materials, then filter in-memory.
  const { data: agencyMaterials } = await admin
    .from("ce_custom_materials")
    .select("id")
    .eq("agency_id", ce.agency_id);
  const materialIds = (agencyMaterials || []).map((m: { id: string }) => m.id);
  if (materialIds.length === 0) return NextResponse.json({ materials: [] });

  const { data: assignments } = await admin
    .from("ce_custom_assignments")
    .select("material_id, target_type, target_value")
    .in("material_id", materialIds);

  const cert = ce.certification_level || "";
  const eligible = new Set<string>();
  for (const a of (assignments || []) as AssignmentRow[]) {
    if (a.target_type === "all_agency") eligible.add(a.material_id);
    else if (a.target_type === "user" && a.target_value === user.id) eligible.add(a.material_id);
    else if (a.target_type === "certification" && a.target_value === cert && cert) eligible.add(a.material_id);
  }

  const eligibleIds = Array.from(eligible);
  if (eligibleIds.length === 0) return NextResponse.json({ materials: [] });

  const { data: materials } = await admin
    .from("ce_custom_materials")
    .select("id, title, description, content_type, created_at")
    .in("id", eligibleIds);

  const { data: completions } = await admin
    .from("ce_custom_completions")
    .select("material_id, completed_at")
    .eq("user_id", user.id)
    .in("material_id", eligibleIds);

  const completionMap = new Map<string, string | null>(
    ((completions || []) as CompletionRow[]).map((c) => [c.material_id, c.completed_at]),
  );

  const result = ((materials || []) as MaterialRow[]).map((m) => ({
    ...m,
    completed_at: completionMap.get(m.id) ?? null,
  }));

  return NextResponse.json({ materials: result });
}

import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface EmployeeRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  certification_level: string | null;
}

interface CompletionRow {
  user_id: string;
  viewed_at: string | null;
  quiz_score: number | null;
  quiz_passed_at: string | null;
  completed_at: string | null;
}

interface AssignmentRow {
  target_type: string;
  target_value: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data: material } = await admin
    .from("ce_custom_materials")
    .select("id, title")
    .eq("id", id)
    .eq("agency_id", ce.agency_id)
    .maybeSingle();
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: assignments } = await admin
    .from("ce_custom_assignments")
    .select("target_type, target_value")
    .eq("material_id", id);

  const userIds = new Set<string>();
  let assignToAll = false;
  const certs = new Set<string>();
  for (const a of (assignments || []) as AssignmentRow[]) {
    if (a.target_type === "all_agency") {
      assignToAll = true;
    } else if (a.target_type === "user" && a.target_value) {
      userIds.add(a.target_value);
    } else if (a.target_type === "certification" && a.target_value) {
      certs.add(a.target_value);
    }
  }

  if (assignToAll) {
    const { data: all } = await admin
      .from("ce_users")
      .select("id")
      .eq("agency_id", ce.agency_id);
    (all || []).forEach((u: { id: string }) => userIds.add(u.id));
  } else if (certs.size > 0) {
    const { data: byCert } = await admin
      .from("ce_users")
      .select("id")
      .eq("agency_id", ce.agency_id)
      .in("certification_level", Array.from(certs));
    (byCert || []).forEach((u: { id: string }) => userIds.add(u.id));
  }

  const userIdList = Array.from(userIds);
  if (userIdList.length === 0) return NextResponse.json({ material, rows: [] });

  const { data: users } = await admin
    .from("ce_users")
    .select("id, first_name, last_name, email, certification_level")
    .in("id", userIdList);

  const { data: completions } = await admin
    .from("ce_custom_completions")
    .select("user_id, viewed_at, quiz_score, quiz_passed_at, completed_at")
    .eq("material_id", id)
    .in("user_id", userIdList);

  const completionMap = new Map<string, CompletionRow>(
    ((completions || []) as CompletionRow[]).map((c) => [c.user_id, c]),
  );

  const rows = ((users || []) as EmployeeRow[]).map((u) => ({
    user: u,
    completion: completionMap.get(u.id) ?? null,
  }));

  return NextResponse.json({ material, rows });
}

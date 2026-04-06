import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cycleId = request.nextUrl.searchParams.get("cycle_id");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || !profile.agency_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = adminClient
      .from("employee_competencies")
      .select(`
        *,
        skill:skill_id(id, name, category, skill_code, certification_levels, is_required),
        cycle:cycle_id(id, name, year, cycle_type)
      `)
      .eq("employee_id", id)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (cycleId) {
      query = query.eq("cycle_id", cycleId);
    }

    const { data: competencies, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ competencies: competencies || [] });
  } catch (error) {
    console.error("GET employee competencies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { competency_id, status, notes } = await request.json();

    if (!competency_id || !status) {
      return NextResponse.json({ error: "Missing competency_id or status" }, { status: 400 });
    }

    const validStatuses = ["not_started", "in_progress", "pending_review", "verified", "failed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) updates.notes = notes;
    if (status === "pending_review" || status === "verified") {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    }

    const { data: updated, error } = await adminClient
      .from("employee_competencies")
      .update(updates)
      .eq("id", competency_id)
      .eq("employee_id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: status === "pending_review" ? "competency_submitted" : "competency_status_changed",
      entity_type: "competency",
      entity_id: competency_id,
      performed_by: user.id,
      new_values: { status, employee_id: id },
    });

    return NextResponse.json({ competency: updated });
  } catch (error) {
    console.error("POST employee competencies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

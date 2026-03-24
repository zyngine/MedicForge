import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const { locked } = await request.json();

    const { data: updated, error } = await adminClient
      .from("verification_cycles")
      .update({ is_locked: !!locked, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: locked ? "cycle_locked" : "cycle_unlocked",
      entity_type: "cycle",
      entity_id: id,
      performed_by: user.id,
    });

    return NextResponse.json({ cycle: updated });
  } catch (error) {
    console.error("POST /api/agency/cycles/[id]/lock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

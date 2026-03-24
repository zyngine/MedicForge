import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role, full_name")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "medical_director") {
      return NextResponse.json({ error: "Only medical directors can deny verifications" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason || "";

    if (reason && reason.length > 1000) {
      return NextResponse.json({ error: "Reason must be 1000 characters or less" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: competency } = await admin
      .from("employee_competencies")
      .select("id, tenant_id")
      .eq("id", id)
      .single();

    if (!competency || competency.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from("employee_competencies")
      .update({ status: "failed", notes: reason || null })
      .eq("id", id);
    if (updateError) throw updateError;

    await admin.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "verification_rejected",
      entity_type: "competency",
      entity_id: id,
      performed_by: user.id,
      performed_by_name: profile.full_name || "Medical Director",
      new_values: { reason },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

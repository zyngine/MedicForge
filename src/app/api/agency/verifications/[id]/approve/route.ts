import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
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
      return NextResponse.json({ error: "Only medical directors can approve verifications" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Verify competency belongs to this tenant
    const { data: competency } = await admin
      .from("employee_competencies")
      .select("id, tenant_id, employee_id, cycle_id")
      .eq("id", id)
      .single();

    if (!competency || competency.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update competency to verified
    const { error: updateError } = await admin
      .from("employee_competencies")
      .update({ status: "verified", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw updateError;

    // Create verification record
    await admin.from("competency_verifications").insert({
      tenant_id: profile.tenant_id,
      competency_id: id,
      employee_id: competency.employee_id,
      cycle_id: competency.cycle_id,
      verified_by: user.id,
      verification_method: "documentation_review",
    });

    // Audit log
    await admin.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "verification_approved",
      entity_type: "competency",
      entity_id: id,
      performed_by: user.id,
      performed_by_name: profile.full_name || "Medical Director",
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "medical_director") {
      return NextResponse.json({ error: "Forbidden — MD only" }, { status: 403 });
    }

    const { competency_ids, verification_method, notes } = await request.json();

    if (!competency_ids?.length) {
      return NextResponse.json({ error: "No competencies selected" }, { status: 400 });
    }

    const { data: mdAssignment } = await adminClient
      .from("medical_director_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .single();

    const now = new Date().toISOString();
    let approved = 0;

    for (const compId of competency_ids) {
      const { error: updateError } = await adminClient
        .from("employee_competencies")
        .update({ status: "verified", completed_at: now, completed_by: user.id, updated_at: now })
        .eq("id", compId)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending_review");

      if (!updateError) {
        await adminClient.from("competency_verifications").insert({
          tenant_id: profile.tenant_id,
          competency_id: compId,
          verified_by: user.id,
          md_assignment_id: mdAssignment?.id,
          verified_at: now,
          verification_method: verification_method || "documentation_review",
          is_batch_verification: true,
          notes: notes || "Batch approved",
        });
        approved++;
      }
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "batch_verification_approved",
      entity_type: "verification",
      entity_id: competency_ids[0],
      performed_by: user.id,
      new_values: { count: approved, competency_ids },
    });

    return NextResponse.json({ success: true, approved });
  } catch (error) {
    console.error("POST batch verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

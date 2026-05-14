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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const { enrollmentId } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createCEAdminClient();
  const { data: enr } = await admin
    .from("ce_enrollments")
    .select("id, user_id, progress_percentage, completion_status, assigned_by")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the target employee is in this agency.
  const { data: targetUser } = await admin
    .from("ce_users")
    .select("agency_id")
    .eq("id", enr.user_id)
    .maybeSingle();
  if (!targetUser || targetUser.agency_id !== ctx.agencyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasProgress =
    (enr.progress_percentage ?? 0) > 0 ||
    enr.completion_status === "in_progress" ||
    enr.completion_status === "completed";

  if (hasProgress) {
    // Keep the enrollment, just strip the assignment metadata.
    await admin
      .from("ce_enrollments")
      .update({ assigned_by: null, due_date: null, assigned_at: null })
      .eq("id", enrollmentId);
    return NextResponse.json({ success: true, kept: true });
  }

  await admin.from("ce_enrollments").delete().eq("id", enrollmentId);
  return NextResponse.json({ success: true, kept: false });
}

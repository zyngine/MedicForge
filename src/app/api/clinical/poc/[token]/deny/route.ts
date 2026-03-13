import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/email-service";
import { clinicalShiftDeniedEmail } from "@/lib/notifications/email-templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const pocResponseNotes: string | null = body.notes || null;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Fetch token with booking details
    const { data: tokenRow, error } = await adminAny
      .from("clinical_poc_tokens")
      .select("*, booking:clinical_shift_bookings(*, shift:clinical_shifts(*, site:clinical_sites(*)), student:users(full_name, email))")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 410 });
    }

    if (tokenRow.action_taken) {
      return NextResponse.json(
        { error: "This request has already been responded to" },
        { status: 409 }
      );
    }

    const booking = tokenRow.booking;
    const now = new Date().toISOString();

    // Update booking status to poc_denied
    await adminAny
      .from("clinical_shift_bookings")
      .update({
        status: "poc_denied",
        poc_response_notes: pocResponseNotes,
        updated_at: now,
      })
      .eq("id", booking.id);

    // Mark token as used
    await adminAny
      .from("clinical_poc_tokens")
      .update({ action_taken: "denied", action_taken_at: now })
      .eq("id", tokenRow.id);

    // Insert audit log
    await adminAny.from("clinical_booking_audit_log").insert({
      booking_id: booking.id,
      tenant_id: tokenRow.tenant_id,
      action: "poc_denied",
      actor_type: "poc",
      notes: pocResponseNotes,
    });

    // Send denial email to student
    const shift = booking.shift;
    const site = shift?.site;
    const student = booking.student;

    if (student?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";
      const template = clinicalShiftDeniedEmail({
        studentName: student.full_name || "Student",
        siteName: site?.name || "Clinical Site",
        shiftTitle: shift?.title || "Clinical Shift",
        shiftDate: shift?.shift_date || "",
        pocNotes: pocResponseNotes,
        scheduleUrl: `${appUrl}/student/clinical/schedule`,
      });

      await sendEmail({ to: student.email, template });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POC Deny] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

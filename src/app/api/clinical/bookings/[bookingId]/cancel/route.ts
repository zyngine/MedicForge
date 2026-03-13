import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/email-service";
import {
  clinicalRequestCancelledEmail,
  clinicalShiftCancelledByAdminEmail,
} from "@/lib/notifications/email-templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string | null = body.reason || null;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Get user role
    const { data: profile } = await admin
      .from("users")
      .select("role, tenant_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }

    const isInstructor = ["instructor", "admin"].includes(profile.role || "");

    // Fetch booking with shift + site + student details
    const { data: booking, error: fetchError } = await adminAny
      .from("clinical_shift_bookings")
      .select("*, shift:clinical_shifts(*, site:clinical_sites(name, contact_email, contact_name)), student:users(full_name, email)")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorization: student can cancel own booking, instructor can cancel any
    if (!isInstructor && booking.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate cancellable status
    const cancellableStatuses = ["pending_poc_approval", "poc_approved", "booked"];
    if (!cancellableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    const cancelledBy = isInstructor ? "instructor" : "student";
    const now = new Date().toISOString();

    // Update booking
    await adminAny.from("clinical_shift_bookings").update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      updated_at: now,
    }).eq("id", bookingId);

    // Insert audit log
    await adminAny.from("clinical_booking_audit_log").insert({
      booking_id: bookingId,
      tenant_id: profile.tenant_id,
      action: isInstructor ? "cancelled_by_instructor" : "cancelled_by_student",
      actor_type: isInstructor ? "instructor" : "student",
      actor_id: user.id,
      notes: reason,
    });

    const shift = booking.shift;
    const site = shift?.site;
    const student = booking.student;
    const studentName = student?.full_name || "A student";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";

    // If was pending approval: notify POC that student cancelled
    if (booking.status === "pending_poc_approval" && site?.contact_email) {
      const template = clinicalRequestCancelledEmail({
        pocName: site.contact_name || "Clinical Coordinator",
        studentName,
        siteName: site.name,
        shiftTitle: shift?.title || "Clinical Shift",
        shiftDate: shift?.shift_date || "",
        startTime: shift?.start_time || "",
        endTime: shift?.end_time || "",
      });

      await sendEmail({ to: site.contact_email, template });
    }

    // If instructor cancelled: notify student
    if (isInstructor && student?.email) {
      const template = clinicalShiftCancelledByAdminEmail({
        studentName,
        siteName: site?.name || "Clinical Site",
        shiftTitle: shift?.title || "Clinical Shift",
        shiftDate: shift?.shift_date || "",
        reason,
        scheduleUrl: `${appUrl}/student/clinical/schedule`,
      });

      await sendEmail({ to: student.email, template });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cancel Booking] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

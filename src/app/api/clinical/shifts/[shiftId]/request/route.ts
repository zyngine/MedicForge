import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/email-service";
import { clinicalShiftRequestEmail } from "@/lib/notifications/email-templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { shiftId } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestNotes: string | null = body.request_notes || null;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Get user profile
    const { data: profile } = await admin
      .from("users")
      .select("tenant_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }

    // Create pending booking via atomic function
    const { data: booking, error: bookError } = await adminAny.rpc(
      "request_clinical_shift",
      {
        p_shift_id: shiftId,
        p_student_id: user.id,
        p_tenant_id: profile.tenant_id,
        p_request_notes: requestNotes,
      }
    );

    if (bookError) {
      console.error("[Shift Request] RPC error:", bookError);
      return NextResponse.json({ error: bookError.message }, { status: 400 });
    }

    // Create POC token
    const { data: tokenRow } = await adminAny
      .from("clinical_poc_tokens")
      .insert({ booking_id: booking.id, tenant_id: profile.tenant_id })
      .select("token")
      .single();

    // Fetch shift + site for email
    const { data: shiftData } = await admin
      .from("clinical_shifts")
      .select("title, shift_date, start_time, end_time, site:clinical_sites(name, contact_email, contact_name, address, city, state)")
      .eq("id", shiftId)
      .single();

    // Insert audit log
    await adminAny.from("clinical_booking_audit_log").insert({
      booking_id: booking.id,
      tenant_id: profile.tenant_id,
      action: "requested",
      actor_type: "student",
      actor_id: user.id,
      notes: requestNotes,
    });

    // Send email to POC
    const site = shiftData?.site as any;
    if (site?.contact_email && tokenRow) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";
      const approveUrl = `${appUrl}/poc/${tokenRow.token}?action=approve`;
      const denyUrl = `${appUrl}/poc/${tokenRow.token}?action=deny`;

      const template = clinicalShiftRequestEmail({
        pocName: site.contact_name || "Clinical Coordinator",
        studentName: profile.full_name || user.email || "A student",
        siteName: site.name,
        shiftTitle: shiftData.title,
        shiftDate: shiftData.shift_date,
        startTime: shiftData.start_time,
        endTime: shiftData.end_time,
        requestNotes,
        approveUrl,
        denyUrl,
      });

      await sendEmail({ to: site.contact_email, template });
    }

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (err) {
    console.error("[Shift Request] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

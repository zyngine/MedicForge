import { createAdminClient } from "@/lib/supabase/admin";
import { generateICS, type CalendarEvent } from "@/lib/calendar-utils";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Lookup subscription by token
    const { data: sub, error: subError } = await adminAny
      .from("calendar_subscriptions")
      .select("user_id, tenant_id")
      .eq("token", token)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: "Invalid calendar token" }, { status: 404 });
    }

    // Update last accessed
    await adminAny
      .from("calendar_subscriptions")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("token", token);

    // Fetch confirmed bookings for this user (filter date in JS for simplicity)
    const { data: bookings } = await adminAny
      .from("clinical_shift_bookings")
      .select("id, shift:clinical_shifts(title, shift_date, start_time, end_time, notes, site:clinical_sites(name, address, city, state))")
      .eq("student_id", sub.user_id)
      .in("status", ["booked", "poc_approved"])
      .not("shift", "is", null);

    const today = new Date().toISOString().split("T")[0];
    const upcomingBookings = (bookings || []).filter(
      (b: any) => b.shift && b.shift.shift_date >= today
    );

    const events: CalendarEvent[] = upcomingBookings.map((b: any) => {
      const shift = b.shift;
      const site = shift?.site;
      const dateStr = shift?.shift_date; // "YYYY-MM-DD"
      const [startH, startM] = (shift?.start_time || "00:00").split(":");
      const [endH, endM] = (shift?.end_time || "01:00").split(":");

      const start = new Date(`${dateStr}T${startH.padStart(2, "0")}:${startM.padStart(2, "0")}:00`);
      const end = new Date(`${dateStr}T${endH.padStart(2, "0")}:${endM.padStart(2, "0")}:00`);

      const location = site
        ? [site.address, site.city, site.state].filter(Boolean).join(", ")
        : undefined;

      return {
        id: b.id,
        title: `Clinical: ${shift?.title || site?.name || "Shift"}`,
        description: shift?.notes || undefined,
        location: location || undefined,
        start,
        end,
      };
    });

    const icsContent = generateICS(events, "MedicForge Clinical Shifts");

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="clinical-shifts.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[Calendar ICS] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

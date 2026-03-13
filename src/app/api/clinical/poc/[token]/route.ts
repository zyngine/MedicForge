import { createAdminClient } from "@/lib/supabase/admin";
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

    // Fetch token record
    const { data: tokenRow, error } = await adminAny
      .from("clinical_poc_tokens")
      .select("*, booking:clinical_shift_bookings(*, shift:clinical_shifts(*, site:clinical_sites(*)), student:users(full_name, email))")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    const booking = tokenRow.booking;
    const shift = booking?.shift;
    const site = shift?.site;
    const student = booking?.student;

    return NextResponse.json({
      tokenId: tokenRow.id,
      alreadyActioned: !!tokenRow.action_taken,
      actionTaken: tokenRow.action_taken,
      booking: {
        id: booking?.id,
        status: booking?.status,
        request_notes: booking?.request_notes,
      },
      shift: {
        title: shift?.title,
        shift_date: shift?.shift_date,
        start_time: shift?.start_time,
        end_time: shift?.end_time,
      },
      site: {
        name: site?.name,
        address: site?.address,
        city: site?.city,
        state: site?.state,
      },
      student: {
        name: student?.full_name || "A student",
      },
    });
  } catch (err) {
    console.error("[POC GET] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

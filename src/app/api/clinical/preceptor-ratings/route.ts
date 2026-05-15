import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin: AnyClient = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    booking_id,
    preceptor_name,
    knowledge_rating,
    communication_rating,
    professionalism_rating,
    overall_comment,
  } = body;

  if (!preceptor_name || typeof preceptor_name !== "string" || !preceptor_name.trim()) {
    return NextResponse.json({ error: "Preceptor name is required" }, { status: 400 });
  }
  for (const [field, value] of [
    ["knowledge_rating", knowledge_rating],
    ["communication_rating", communication_rating],
    ["professionalism_rating", professionalism_rating],
  ] as const) {
    if (typeof value !== "number" || value < 1 || value > 5 || !Number.isInteger(value)) {
      return NextResponse.json({ error: `${field} must be an integer 1-5` }, { status: 400 });
    }
  }

  let shift_id: string | null = null;
  let site_id: string | null = null;
  if (booking_id) {
    const { data: booking } = await admin
      .from("clinical_shift_bookings")
      .select("shift_id, tenant_id, student_id, shift:clinical_shifts(site_id)")
      .eq("id", booking_id)
      .maybeSingle();
    if (
      !booking ||
      booking.tenant_id !== profile.tenant_id ||
      booking.student_id !== user.id
    ) {
      return NextResponse.json({ error: "Booking not found or not yours" }, { status: 404 });
    }
    shift_id = booking.shift_id;
    site_id = booking.shift?.site_id ?? null;
  }

  const { data, error } = await admin
    .from("clinical_preceptor_ratings")
    .insert({
      tenant_id: profile.tenant_id,
      booking_id: booking_id || null,
      shift_id,
      site_id,
      student_id: user.id,
      preceptor_name: preceptor_name.trim(),
      knowledge_rating,
      communication_rating,
      professionalism_rating,
      overall_comment: overall_comment?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rating: data });
}

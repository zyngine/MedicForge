import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, agency_role")
    .eq("id", user.id)
    .single();
  return profile ?? null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const profile = await getProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("agency_settings")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data ?? {});
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const profile = await getProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { agency_license_number, state_code, county, verification_reminder_days, annual_cycle_month } = body;

    const { data, error } = await supabase
      .from("agency_settings")
      .upsert(
        {
          tenant_id: profile.tenant_id,
          agency_license_number: agency_license_number ?? null,
          state_code: state_code ?? "PA",
          county: county ?? null,
          verification_reminder_days: verification_reminder_days ?? 30,
          annual_cycle_month: annual_cycle_month ?? 1,
        },
        { onConflict: "tenant_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

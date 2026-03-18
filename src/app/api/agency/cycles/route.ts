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
  return profile ? { ...profile, userId: user.id } : null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const profile = await getProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["agency_admin", "medical_director"].includes(profile.agency_role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("verification_cycles")
      .select(`
        *,
        competencies:employee_competencies(id, status)
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("start_date", { ascending: false });

    if (error) throw error;

    // Compute progress stats per cycle
    const cycles = (data ?? []).map((c) => {
      const total = c.competencies?.length ?? 0;
      const completed = c.competencies?.filter(
        (ec: { status: string | null }) => ec.status === "verified"
      ).length ?? 0;
      const pending = c.competencies?.filter(
        (ec: { status: string | null }) => ec.status === "pending_review"
      ).length ?? 0;
      return {
        ...c,
        totalSkills: total,
        completedSkills: completed,
        pendingVerifications: pending,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        competencies: undefined,
      };
    });

    return NextResponse.json(cycles);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const profile = await getProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, cycle_type, start_date, end_date, year } = body;

    if (!name || !cycle_type || !start_date || !end_date) {
      return NextResponse.json({ error: "name, cycle_type, start_date, end_date required" }, { status: 400 });
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    const { data: cycle, error } = await supabase
      .from("verification_cycles")
      .insert({
        tenant_id: profile.tenant_id,
        name,
        cycle_type,
        start_date,
        end_date,
        year: year || new Date(start_date).getFullYear(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "cycle_created",
      entity_type: "verification_cycle",
      entity_id: cycle.id,
      performed_by: profile.userId,
      new_values: { name, cycle_type, start_date, end_date },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

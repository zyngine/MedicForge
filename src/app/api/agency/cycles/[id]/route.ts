import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || !profile.agency_role ||
        !["agency_admin", "medical_director"].includes(profile.agency_role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: cycle, error } = await adminClient
      .from("verification_cycles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const { data: competencies } = await (adminClient as any)
      .from("employee_competencies")
      .select(`
        *,
        employee:agency_employees!employee_competencies_employee_id_fkey(id, first_name, last_name, certification_level, is_active),
        skill:skill_library!employee_competencies_skill_id_fkey(id, name, category, skill_code)
      `)
      .eq("cycle_id", id)
      .eq("tenant_id", profile.tenant_id);

    const employeeMap = new Map<string, {
      employee: any;
      total: number;
      verified: number;
      pending: number;
      failed: number;
    }>();

    for (const c of competencies || []) {
      if (!c.employee) continue;
      const eid = c.employee.id;
      if (!employeeMap.has(eid)) {
        employeeMap.set(eid, { employee: c.employee, total: 0, verified: 0, pending: 0, failed: 0 });
      }
      const entry = employeeMap.get(eid)!;
      entry.total++;
      if (c.status === "verified") entry.verified++;
      else if (c.status === "pending_review") entry.pending++;
      else if (c.status === "failed") entry.failed++;
    }

    const employees = Array.from(employeeMap.values()).map((e) => ({
      ...e.employee,
      total: e.total,
      verified: e.verified,
      pending: e.pending,
      failed: e.failed,
      completion: e.total > 0 ? Math.round((e.verified / e.total) * 100) : 0,
    }));

    const totalCompetencies = competencies?.length || 0;
    const verifiedCount = competencies?.filter((c: any) => c.status === "verified").length || 0;
    const pendingCount = competencies?.filter((c: any) => c.status === "pending_review").length || 0;

    return NextResponse.json({
      cycle,
      employees,
      stats: {
        totalCompetencies,
        verified: verifiedCount,
        pending: pendingCount,
        completion: totalCompetencies > 0 ? Math.round((verifiedCount / totalCompetencies) * 100) : 0,
        employeeCount: employees.length,
      },
    });
  } catch (error) {
    console.error("GET /api/agency/cycles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const updates = await request.json();
    const allowed: Record<string, unknown> = {};
    for (const f of ["name", "start_date", "end_date", "is_active"]) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }
    allowed.updated_at = new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("verification_cycles")
      .update(allowed)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .eq("is_locked", false)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cycle: updated });
  } catch (error) {
    console.error("PUT /api/agency/cycles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

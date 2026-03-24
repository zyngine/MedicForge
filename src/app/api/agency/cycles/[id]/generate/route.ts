import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
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

    const { data: cycle } = await adminClient
      .from("verification_cycles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    if (cycle.is_locked) {
      return NextResponse.json({ error: "Cycle is locked" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const employeeIds: string[] | undefined = body.employee_ids;
    const skillIds: string[] | undefined = body.skill_ids;

    let empQuery = adminClient
      .from("agency_employees")
      .select("id, certification_level")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true);

    if (employeeIds?.length) {
      empQuery = empQuery.in("id", employeeIds);
    }

    const { data: employees } = await empQuery;

    if (!employees?.length) {
      return NextResponse.json({ error: "No active employees found" }, { status: 400 });
    }

    let skillQuery = adminClient
      .from("skill_library")
      .select("id, certification_levels, is_required")
      .eq("is_active", true)
      .or(`tenant_id.eq.${profile.tenant_id},is_system_default.eq.true`);

    if (skillIds?.length) {
      skillQuery = skillQuery.in("id", skillIds);
    }

    const { data: skills } = await skillQuery;

    if (!skills?.length) {
      return NextResponse.json({ error: "No skills found" }, { status: 400 });
    }

    const { data: existing } = await adminClient
      .from("employee_competencies")
      .select("employee_id, skill_id")
      .eq("cycle_id", id)
      .eq("tenant_id", profile.tenant_id);

    const existingSet = new Set(
      (existing || []).map((e) => `${e.employee_id}:${e.skill_id}`)
    );

    const records: Array<{
      tenant_id: string;
      employee_id: string;
      skill_id: string;
      cycle_id: string;
      status: "not_started";
    }> = [];

    for (const emp of employees) {
      for (const skill of skills) {
        const levels = skill.certification_levels || [];
        if (levels.length > 0 && !levels.includes(emp.certification_level)) {
          continue;
        }

        const key = `${emp.id}:${skill.id}`;
        if (existingSet.has(key)) continue;

        records.push({
          tenant_id: profile.tenant_id,
          employee_id: emp.id,
          skill_id: skill.id,
          cycle_id: id,
          status: "not_started",
        });
      }
    }

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: "All competencies already exist for this cycle",
      });
    }

    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await adminClient
        .from("employee_competencies")
        .insert(batch);

      if (insertError) {
        console.error("Batch insert error:", insertError);
        return NextResponse.json({
          error: `Failed at batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`,
          generated: totalInserted,
        }, { status: 500 });
      }
      totalInserted += batch.length;
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "cycle_competencies_generated",
      entity_type: "cycle",
      entity_id: id,
      performed_by: user.id,
      new_values: {
        employees: employees.length,
        skills: skills.length,
        records_created: totalInserted,
      },
    });

    return NextResponse.json({
      success: true,
      generated: totalInserted,
      employees: employees.length,
      skills: skills.length,
    });
  } catch (error) {
    console.error("POST /api/agency/cycles/[id]/generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

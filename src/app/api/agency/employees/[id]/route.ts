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

    if (!profile?.tenant_id || !profile.agency_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: employee, error } = await adminClient
      .from("agency_employees")
      .select("*, supervisor:supervisor_id(id, first_name, last_name)")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { data: competencies } = await adminClient
      .from("employee_competencies")
      .select("*, skill:skill_id(id, name, category, skill_code, certification_levels)")
      .eq("employee_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ employee, competencies: competencies || [] });
  } catch (error) {
    console.error("GET /api/agency/employees/[id] error:", error);
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
    const allowed: Record<string, any> = {};
    const fields = [
      "first_name", "last_name", "email", "phone", "employee_number",
      "certification_level", "state_certification_number", "national_registry_number",
      "certification_expiration", "hire_date", "department", "position",
      "supervisor_id", "is_active",
    ];
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }
    allowed.updated_at = new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("agency_employees")
      .update(allowed)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      console.error("Update employee error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employee_updated",
      entity_type: "employee",
      entity_id: id,
      performed_by: user.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new_values: allowed as any,
    });

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error("PUT /api/agency/employees/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { error } = await adminClient
      .from("agency_employees")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employee_deactivated",
      entity_type: "employee",
      entity_id: id,
      performed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agency/employees/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

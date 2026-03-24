import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
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

    const { employees } = await request.json();
    if (!employees?.length) {
      return NextResponse.json({ error: "No employees provided" }, { status: 400 });
    }
    if (employees.length > 500) {
      return NextResponse.json({ error: "Maximum 500 employees per import" }, { status: 400 });
    }

    const results: Array<{ row: number; name: string; success: boolean; error?: string }> = [];
    const validLevels = ["EMR", "EMT", "AEMT", "Paramedic", "Other"];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        if (!emp.first_name || !emp.last_name) {
          results.push({ row: i + 1, name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(), success: false, error: "Missing name" });
          continue;
        }

        const level = validLevels.includes(emp.certification_level) ? emp.certification_level : "Other";

        const { error: insertError } = await adminClient
          .from("agency_employees")
          .insert({
            tenant_id: profile.tenant_id,
            first_name: emp.first_name.trim(),
            last_name: emp.last_name.trim(),
            email: emp.email?.trim() || null,
            phone: emp.phone?.trim() || null,
            employee_number: emp.employee_number?.trim() || null,
            certification_level: level,
            state_certification_number: emp.state_cert_number?.trim() || null,
            national_registry_number: emp.nremt_number?.trim() || null,
            certification_expiration: emp.cert_expiration || null,
            hire_date: emp.hire_date || null,
            department: emp.department?.trim() || null,
            position: emp.position?.trim() || null,
          });

        if (insertError) {
          results.push({ row: i + 1, name: `${emp.first_name} ${emp.last_name}`, success: false, error: insertError.message });
        } else {
          results.push({ row: i + 1, name: `${emp.first_name} ${emp.last_name}`, success: true });
        }
      } catch (err) {
        results.push({ row: i + 1, name: `${emp.first_name || ""} ${emp.last_name || ""}`, success: false, error: "Unexpected error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employees_bulk_imported",
      entity_type: "employee",
      entity_id: null,
      performed_by: user.id,
      new_values: { total: employees.length, imported: successCount },
    });

    return NextResponse.json({ results, imported: successCount, total: employees.length });
  } catch (error) {
    console.error("POST /api/agency/employees/import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

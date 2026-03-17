import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
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
    const profile = await getAdminProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["agency_admin", "medical_director"].includes(profile.agency_role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("agency_employees")
      .select(`
        *,
        competencies:employee_competencies(
          id, status, cycle_id,
          skill:skill_library(id, name)
        )
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("last_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const profile = await getAdminProfile(supabase);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, certLevel, certNumber, certExpiry, employeeId } = body;

    if (!firstName || !lastName || !certLevel) {
      return NextResponse.json({ error: "firstName, lastName, and certLevel are required" }, { status: 400 });
    }

    const { data: employee, error } = await supabase
      .from("agency_employees")
      .insert({
        tenant_id: profile.tenant_id,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        certification_level: certLevel,
        state_certification_number: certNumber || null,
        certification_expiration: certExpiry || null,
        employee_number: employeeId || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employee_added",
      entity_type: "employee",
      entity_id: employee.id,
      performed_by: profile.userId,
      performed_by_name: `${firstName} ${lastName}`,
      new_values: { firstName, lastName, certLevel },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["agency_admin", "medical_director"].includes(profile.agency_role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("employee_competencies")
      .select(`
        id, status, notes, updated_at,
        employee:agency_employees(id, first_name, last_name, certification_level),
        skill:skill_library(id, name, category),
        cycle:verification_cycles(id, name)
      `)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "pending_review")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

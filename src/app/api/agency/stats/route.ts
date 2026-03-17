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

    const tid = profile.tenant_id;

    const [empResult, compResult, auditResult] = await Promise.all([
      supabase
        .from("agency_employees")
        .select("id, is_active, certification_expiration")
        .eq("tenant_id", tid),
      supabase
        .from("employee_competencies")
        .select("id, status")
        .eq("tenant_id", tid),
      supabase
        .from("agency_audit_log")
        .select("id, action, performed_by_name, entity_type, created_at")
        .eq("tenant_id", tid)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const employees = empResult.data ?? [];
    const competencies = compResult.data ?? [];
    const now = new Date();
    const soon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.is_active).length,
      pendingVerifications: competencies.filter((c) => c.status === "pending_review").length,
      completedThisCycle: competencies.filter((c) => c.status === "verified").length,
      verificationRate: competencies.length > 0
        ? Math.round((competencies.filter((c) => c.status === "verified").length / competencies.length) * 100)
        : 0,
      upcomingExpirations: employees.filter((e) => {
        if (!e.certification_expiration) return false;
        const exp = new Date(e.certification_expiration);
        return exp > now && exp <= soon;
      }).length,
    };

    return NextResponse.json({ stats, recentActivity: auditResult.data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
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

    const type = request.nextUrl.searchParams.get("type") || "compliance";
    const cycleId = request.nextUrl.searchParams.get("cycle_id");
    const format = request.nextUrl.searchParams.get("format") || "json";

    if (type === "compliance") {
      const { data: employees } = await adminClient
        .from("agency_employees")
        .select("id, first_name, last_name, certification_level, certification_expiration, is_active")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("last_name");

      let compQuery = adminClient
        .from("employee_competencies")
        .select("employee_id, status")
        .eq("tenant_id", profile.tenant_id);

      if (cycleId) compQuery = compQuery.eq("cycle_id", cycleId);

      const { data: competencies } = await compQuery;

      const empMap = new Map<string, { total: number; verified: number; pending: number; failed: number }>();
      for (const c of competencies || []) {
        if (!empMap.has(c.employee_id)) empMap.set(c.employee_id, { total: 0, verified: 0, pending: 0, failed: 0 });
        const e = empMap.get(c.employee_id)!;
        e.total++;
        if (c.status === "verified") e.verified++;
        else if (c.status === "pending_review") e.pending++;
        else if (c.status === "failed") e.failed++;
      }

      const rows = (employees || []).map((emp) => {
        const stats = empMap.get(emp.id) || { total: 0, verified: 0, pending: 0, failed: 0 };
        return {
          name: `${emp.last_name}, ${emp.first_name}`,
          certification_level: emp.certification_level,
          certification_expiration: emp.certification_expiration,
          total_skills: stats.total,
          verified: stats.verified,
          pending: stats.pending,
          failed: stats.failed,
          completion: stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0,
        };
      });

      if (format === "csv") {
        const header = "Name,Cert Level,Cert Expiration,Total Skills,Verified,Pending,Failed,Completion %";
        const csvRows = rows.map((r) =>
          `"${r.name}",${r.certification_level},${r.certification_expiration || ""},${r.total_skills},${r.verified},${r.pending},${r.failed},${r.completion}%`
        );
        const csv = [header, ...csvRows].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="compliance-report-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      return NextResponse.json({ rows, type: "compliance" });
    }

    if (type === "expiring") {
      const daysAhead = Math.min(365, Math.max(1, parseInt(request.nextUrl.searchParams.get("days") || "90")));
      const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: expiring } = await adminClient
        .from("agency_employees")
        .select("id, first_name, last_name, certification_level, certification_expiration, email")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .lte("certification_expiration", cutoff)
        .order("certification_expiration");

      if (format === "csv") {
        const header = "Name,Cert Level,Expiration Date,Email";
        const csvRows = (expiring || []).map((e) =>
          `"${e.last_name}, ${e.first_name}",${e.certification_level},${e.certification_expiration},${e.email || ""}`
        );
        return new NextResponse([header, ...csvRows].join("\n"), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="expiring-certs-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      return NextResponse.json({ rows: expiring || [], type: "expiring" });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/agency/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

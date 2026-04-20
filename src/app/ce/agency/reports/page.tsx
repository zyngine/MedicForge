"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { Download } from "lucide-react";

interface ReportRow {
  employee: string;
  certification_level: string;
  nremt_id: string;
  course: string;
  capce_course_number: string;
  ceh_hours: number;
  completed_at: string;
}

const CEH_REQUIRED: Record<string, number> = { EMR: 24, EMT: 36, AEMT: 48, Paramedic: 72 };

export default function CEAgencyReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const load = async (aId: string) => {
    setIsLoading(true);
    const supabase = createCEClient();

    let q = supabase
      .from("ce_enrollments")
      .select("completed_at, ce_users!inner(first_name, last_name, nremt_id, certification_level, agency_id), ce_courses(title, capce_course_number, ceh_hours)")
      .eq("completion_status", "completed")
      .eq("ce_users.agency_id", aId);

    if (dateFrom) q = q.gte("completed_at", dateFrom);
    if (dateTo) q = q.lte("completed_at", dateTo + "T23:59:59");

    const { data } = await q;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agencyOnly = (data || []) as any[];

    setRows(agencyOnly.map((r) => ({
      employee: `${r.ce_users?.first_name} ${r.ce_users?.last_name}`,
      certification_level: r.ce_users?.certification_level || "",
      nremt_id: r.ce_users?.nremt_id || "MISSING",
      course: r.ce_courses?.title || "",
      capce_course_number: r.ce_courses?.capce_course_number || "",
      ceh_hours: r.ce_courses?.ceh_hours || 0,
      completed_at: r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "",
    })));
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split("T")[0];
      setDateFrom(from);
      const supabase = createCEClient();
      const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", (await supabase.auth.getUser()).data.user?.id || "").single();
      if (me?.agency_id) {
        setAgencyId(me.agency_id);
        load(me.agency_id);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const exportCSV = () => {
    const header = "Employee,Cert Level,NREMT ID,Course,CAPCE #,CEH Hours,Completed Date";
    const csvRows = rows.map((r) => [
      r.employee,
      r.certification_level,
      r.nremt_id,
      `"${r.course}"`,
      r.capce_course_number,
      r.ceh_hours,
      r.completed_at,
    ].join(","));
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agency-ce-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compliance summary by employee
  const employeeMap: Record<string, { level: string; ceh: number }> = {};
  rows.forEach((r) => {
    if (!employeeMap[r.employee]) employeeMap[r.employee] = { level: r.certification_level, ceh: 0 };
    employeeMap[r.employee].ceh += r.ceh_hours;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agency CE Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Export completion records for compliance and audit purposes</p>
      </div>

      {/* Date filter */}
      <div className="bg-card border rounded-lg p-5 flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <label className="text-sm font-medium">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={() => agencyId && load(agencyId)}>Refresh</Button>
        <Button onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Compliance summary */}
      {!isLoading && Object.keys(employeeMap).length > 0 && (
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold text-sm mb-3">CEH Summary ({dateFrom} – {dateTo})</h2>
          <div className="space-y-3">
            {Object.entries(employeeMap).map(([name, { level, ceh }]) => {
              const required = CEH_REQUIRED[level] || 36;
              const pct = Math.min(Math.round((ceh / required) * 100), 100);
              const compliant = ceh >= required;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{level}</span>
                      <span className={compliant ? "text-green-700 font-medium" : "text-red-600 font-medium"}>{ceh.toFixed(1)}h / {required}h</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${compliant ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completions table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <p className="font-medium text-sm">{rows.length} completion{rows.length !== 1 ? "s" : ""} in range</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">No completions found in this date range.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">NREMT ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.employee}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.nremt_id === "MISSING" ? <span className="text-red-600">Missing</span> : r.nremt_id}</td>
                  <td className="px-4 py-3">
                    <p>{r.course}</p>
                    {r.capce_course_number && <p className="text-xs text-muted-foreground font-mono">{r.capce_course_number}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.ceh_hours}h</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.completed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

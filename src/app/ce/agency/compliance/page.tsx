"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface EmployeeCompliance {
  id: string;
  first_name: string;
  last_name: string;
  certification_level: string | null;
  completed: number;
  total_ceh: number;
  last_completed_at: string | null;
}

const REQUIRED_CEH: Record<string, number> = {
  EMR: 24,
  EMT: 36,
  AEMT: 48,
  Paramedic: 72,
};

export default function CEAgencyCompliancePage() {
  const [employees, setEmployees] = useState<EmployeeCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "compliant" | "non_compliant">("all");

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ceUser } = await supabase.from("ce_users").select("agency_id").eq("id", user.id).single();
      if (!ceUser?.agency_id) { setIsLoading(false); return; }

      const { data: members } = await supabase
        .from("ce_users")
        .select("id, first_name, last_name, certification_level")
        .eq("agency_id", ceUser.agency_id)
        .order("last_name");

      const typedMembers = (members || []) as { id: string; first_name: string | null; last_name: string | null; certification_level: string | null }[];
      if (typedMembers.length === 0) { setIsLoading(false); return; }

      const { data: enrollments } = await supabase
        .from("ce_enrollments")
        .select("user_id, completion_status, completed_at, ce_courses(ceh_hours)")
        .in("user_id", typedMembers.map((m) => m.id))
        .eq("completion_status", "completed");

      const byUser: Record<string, { completed: number; ceh: number; last: string | null }> = {};
      (enrollments || []).forEach((en: any) => {
        if (!byUser[en.user_id]) byUser[en.user_id] = { completed: 0, ceh: 0, last: null };
        byUser[en.user_id].completed++;
        byUser[en.user_id].ceh += en.ce_courses?.ceh_hours || 0;
        if (!byUser[en.user_id].last || (en.completed_at && en.completed_at > byUser[en.user_id].last!)) {
          byUser[en.user_id].last = en.completed_at;
        }
      });

      setEmployees(typedMembers.map((m) => ({
        ...m,
        completed: byUser[m.id]?.completed || 0,
        total_ceh: byUser[m.id]?.ceh || 0,
        last_completed_at: byUser[m.id]?.last || null,
      })));
      setIsLoading(false);
    };
    load();
  }, []);

  const getStatus = (emp: EmployeeCompliance) => {
    const required = REQUIRED_CEH[emp.certification_level || ""] || 36;
    if (emp.total_ceh >= required) return "compliant";
    if (emp.total_ceh > 0) return "partial";
    return "none";
  };

  const filtered = employees.filter((e) => {
    if (filter === "all") return true;
    const status = getStatus(e);
    if (filter === "compliant") return status === "compliant";
    if (filter === "non_compliant") return status !== "compliant";
    return true;
  });

  const compliantCount = employees.filter((e) => getStatus(e) === "compliant").length;
  const complianceRate = employees.length > 0 ? Math.round((compliantCount / employees.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">CE status across your department (2-year NREMT cycle)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5 text-center">
          <p className={`text-3xl font-bold ${complianceRate >= 80 ? "text-green-700" : complianceRate >= 50 ? "text-yellow-700" : "text-red-700"}`}>{complianceRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">Compliance Rate</p>
        </div>
        <div className="bg-white border rounded-lg p-5 text-center">
          <p className="text-3xl font-bold text-green-700">{compliantCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Compliant</p>
        </div>
        <div className="bg-white border rounded-lg p-5 text-center">
          <p className="text-3xl font-bold text-red-700">{employees.length - compliantCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Need More CEH</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "compliant", "non_compliant"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filter === f ? "bg-gray-900 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {f === "all" ? "All" : f === "compliant" ? "Compliant" : "Needs CEH"}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cert Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Required CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Earned CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Activity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const required = REQUIRED_CEH[emp.certification_level || ""] || 36;
                const status = getStatus(emp);
                const pct = Math.min(100, Math.round((emp.total_ceh / required) * 100));
                return (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{emp.first_name} {emp.last_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.certification_level || "Unknown"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{required}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${status === "compliant" ? "text-green-700" : "text-red-700"}`}>{emp.total_ceh.toFixed(1)}h</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${status === "compliant" ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {emp.last_completed_at ? new Date(emp.last_completed_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      {status === "compliant" ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle className="h-3.5 w-3.5" />Compliant</span>
                      ) : status === "partial" ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-700"><Clock className="h-3.5 w-3.5" />In Progress</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />No CEH</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Required CEH based on NREMT 2-year recertification: EMR 24h · EMT 36h · AEMT 48h · Paramedic 72h
      </p>
    </div>
  );
}

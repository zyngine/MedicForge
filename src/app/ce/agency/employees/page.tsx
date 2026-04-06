"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner, Input } from "@/components/ui";
import { Users, Search } from "lucide-react";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  certification_level: string | null;
  state: string | null;
  nremt_id: string | null;
  completed: number;
  in_progress: number;
  total_ceh: number;
}

export default function CEAgencyEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ceUser } = await supabase.from("ce_users").select("agency_id").eq("id", user.id).single();
      if (!ceUser?.agency_id) { setIsLoading(false); return; }

      const { data: members } = await supabase
        .from("ce_users")
        .select("id, first_name, last_name, email, certification_level, state, nremt_id")
        .eq("agency_id", ceUser.agency_id)
        .order("last_name");

      const typedMembers = (members || []) as { id: string; first_name: string | null; last_name: string | null; email: string | null; certification_level: string | null; state: string | null; nremt_id: string | null }[];
      if (typedMembers.length === 0) { setIsLoading(false); return; }

      const { data: enrollments } = await supabase
        .from("ce_enrollments")
        .select("user_id, completion_status, ce_courses(ceh_hours)")
        .in("user_id", typedMembers.map((m) => m.id));

      const byUser: Record<string, { completed: number; in_progress: number; ceh: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (enrollments || []).forEach((en: any) => {
        if (!byUser[en.user_id]) byUser[en.user_id] = { completed: 0, in_progress: 0, ceh: 0 };
        if (en.completion_status === "completed") {
          byUser[en.user_id].completed++;
          byUser[en.user_id].ceh += en.ce_courses?.ceh_hours || 0;
        } else if (en.completion_status === "in_progress") {
          byUser[en.user_id].in_progress++;
        }
      });

      setEmployees(typedMembers.map((m) => ({
        ...m,
        completed: byUser[m.id]?.completed || 0,
        in_progress: byUser[m.id]?.in_progress || 0,
        total_ceh: byUser[m.id]?.ceh || 0,
      })));
      setIsLoading(false);
    };
    load();
  }, []);

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.email?.toLowerCase().includes(s) ?? false) ||
      (e.first_name?.toLowerCase().includes(s) ?? false) ||
      (e.last_name?.toLowerCase().includes(s) ?? false) ||
      (e.nremt_id && e.nremt_id.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Roster</h1>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{search ? "No employees found" : "No employees in your agency yet"}</p>
            {!search && <p className="text-xs mt-1">Employees join by using your agency invite code during registration.</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cert Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">NREMT ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">In Progress</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH Earned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.certification_level || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.nremt_id || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${emp.completed > 0 ? "text-green-700" : "text-muted-foreground"}`}>{emp.completed}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.in_progress}</td>
                  <td className="px-4 py-3 font-bold text-red-700">{emp.total_ceh.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

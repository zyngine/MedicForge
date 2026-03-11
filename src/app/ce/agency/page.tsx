"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { Users, CheckCircle, Clock, Award, ArrowRight } from "lucide-react";

interface AgencyStats {
  totalEmployees: number;
  compliant: number;
  inProgress: number;
  totalCEH: number;
  agencyName: string;
  subscriptionTier: string;
  subscriptionEnd: string | null;
}

interface EmployeeSummary {
  id: string;
  first_name: string;
  last_name: string;
  certification_level: string | null;
  completed_count: number;
  total_ceh: number;
}

export default function CEAgencyDashboardPage() {
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [topEmployees, setTopEmployees] = useState<EmployeeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("agency_id")
        .eq("id", user.id)
        .single();

      if (!ceUser?.agency_id) { setIsLoading(false); return; }
      const agencyId = ceUser.agency_id;

      const [agencyRes, employeesRes] = await Promise.all([
        supabase.from("ce_agencies").select("name, subscription_tier, subscription_end").eq("id", agencyId).single(),
        supabase.from("ce_users").select("id, first_name, last_name, certification_level").eq("agency_id", agencyId),
      ]);

      const employees = employeesRes.data || [];

      if (employees.length > 0) {
        const { data: enrollments } = await supabase
          .from("ce_enrollments")
          .select("user_id, completion_status, ce_courses(ceh_hours)")
          .in("user_id", employees.map((e) => e.id));

        const byUser: Record<string, { completed: number; ceh: number }> = {};
        (enrollments || []).forEach((en: any) => {
          if (!byUser[en.user_id]) byUser[en.user_id] = { completed: 0, ceh: 0 };
          if (en.completion_status === "completed") {
            byUser[en.user_id].completed++;
            byUser[en.user_id].ceh += en.ce_courses?.ceh_hours || 0;
          }
        });

        const compliant = employees.filter((e) => (byUser[e.id]?.completed || 0) >= 1).length;
        const inProgress = employees.filter((e) => {
          const enCount = (enrollments || []).filter((en: any) => en.user_id === e.id && en.completion_status === "in_progress").length;
          return enCount > 0;
        }).length;
        const totalCEH = Object.values(byUser).reduce((sum, u) => sum + u.ceh, 0);

        setStats({
          totalEmployees: employees.length,
          compliant,
          inProgress,
          totalCEH,
          agencyName: agencyRes.data?.name || "",
          subscriptionTier: agencyRes.data?.subscription_tier || "",
          subscriptionEnd: agencyRes.data?.subscription_end || null,
        });

        setTopEmployees(
          employees
            .map((e) => ({ ...e, completed_count: byUser[e.id]?.completed || 0, total_ceh: byUser[e.id]?.ceh || 0 }))
            .sort((a, b) => b.total_ceh - a.total_ceh)
            .slice(0, 5)
        );
      } else {
        setStats({
          totalEmployees: 0, compliant: 0, inProgress: 0, totalCEH: 0,
          agencyName: agencyRes.data?.name || "",
          subscriptionTier: agencyRes.data?.subscription_tier || "",
          subscriptionEnd: agencyRes.data?.subscription_end || null,
        });
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{stats?.agencyName || "Agency Dashboard"}</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{stats?.subscriptionTier} plan{stats?.subscriptionEnd ? ` · Expires ${new Date(stats.subscriptionEnd).toLocaleDateString()}` : ""}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: stats?.totalEmployees, icon: Users, color: "text-blue-700", href: "/ce/agency/employees" },
          { label: "Compliant (≥1 course)", value: stats?.compliant, icon: CheckCircle, color: "text-green-700", href: "/ce/agency/compliance" },
          { label: "In Progress", value: stats?.inProgress, icon: Clock, color: "text-yellow-700", href: "/ce/agency/employees" },
          { label: "Total CEH Earned", value: stats?.totalCEH?.toFixed(1), icon: Award, color: "text-red-700", href: "/ce/agency/compliance" },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? 0}</p>
              </div>
              <Icon className={`h-5 w-5 mt-1 ${color} opacity-60`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: "Employee Roster", desc: "View and manage your team", href: "/ce/agency/employees" },
          { title: "Compliance Report", desc: "Track CE status across the department", href: "/ce/agency/compliance" },
          { title: "Browse Catalog", desc: "Assign training to employees", href: "/ce/catalog" },
        ].map(({ title, desc, href }) => (
          <Link key={href} href={href} className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow group">
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>

      {/* Top performers */}
      {topEmployees.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Top Performers</h2>
            <Link href="/ce/agency/employees" className="text-sm text-red-700 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="bg-white border rounded-lg divide-y">
            {topEmployees.map((emp, i) => (
              <div key={emp.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.certification_level || "—"} · {emp.completed_count} course{emp.completed_count !== 1 ? "s" : ""} completed</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-700">{emp.total_ceh.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

interface MonthBucket { label: string; enrollments: number; completions: number; }
interface CourseStats { id: string; title: string; enrollments: number; completions: number; ceh_hours: number; }
interface CertStats { level: string; count: number; ceh: number; }

export default function CEAdminAnalyticsPage() {
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [topCourses, setTopCourses] = useState<CourseStats[]>([]);
  const [certStats, setCertStats] = useState<CertStats[]>([]);
  const [totals, setTotals] = useState({ enrollments: 0, completions: 0, users: 0, ceh: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [enrollRes, usersRes] = await Promise.all([
        supabase
          .from("ce_enrollments")
          .select("user_id, completion_status, enrolled_at, completed_at, ce_courses(id, title, ceh_hours), ce_users(certification_level)"),
        supabase.from("ce_users").select("id", { count: "exact", head: true }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrollments = (enrollRes.data || []) as any[];

      // Monthly buckets — last 6 months
      const buckets: Record<string, { enrollments: number; completions: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets[key] = { enrollments: 0, completions: 0 };
      }

      let totalCEH = 0;
      const courseMap: Record<string, CourseStats> = {};
      const certMap: Record<string, CertStats> = {};

      enrollments.forEach((en) => {
        const eKey = en.enrolled_at ? en.enrolled_at.substring(0, 7) : null;
        if (eKey && buckets[eKey]) buckets[eKey].enrollments++;

        if (en.completion_status === "completed") {
          const cKey = en.completed_at ? en.completed_at.substring(0, 7) : null;
          if (cKey && buckets[cKey]) buckets[cKey].completions++;
          const ceh = en.ce_courses?.ceh_hours || 0;
          totalCEH += ceh;

          // Course stats
          const courseId = en.ce_courses?.id;
          if (courseId) {
            if (!courseMap[courseId]) courseMap[courseId] = { id: courseId, title: en.ce_courses.title, enrollments: 0, completions: 0, ceh_hours: ceh };
            courseMap[courseId].completions++;
          }

          // Cert level stats
          const level = en.ce_users?.certification_level || "Unknown";
          if (!certMap[level]) certMap[level] = { level, count: 0, ceh: 0 };
          certMap[level].count++;
          certMap[level].ceh += ceh;
        }

        // Enrollments per course
        const courseId = en.ce_courses?.id;
        if (courseId) {
          if (!courseMap[courseId]) courseMap[courseId] = { id: courseId, title: en.ce_courses?.title || "", enrollments: 0, completions: 0, ceh_hours: en.ce_courses?.ceh_hours || 0 };
          courseMap[courseId].enrollments++;
        }
      });

      setMonths(Object.entries(buckets).map(([key, v]) => ({
        label: new Date(key + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        ...v,
      })));

      setTopCourses(Object.values(courseMap).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5));
      setCertStats(Object.values(certMap).sort((a, b) => b.count - a.count));
      setTotals({ enrollments: enrollments.length, completions: enrollments.filter((e) => e.completion_status === "completed").length, users: usersRes.count || 0, ceh: totalCEH });
      setIsLoading(false);
    };
    load();
  }, []);

  const maxEnrollments = Math.max(...months.map((m) => m.enrollments), 1);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide enrollment and completion metrics</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totals.users, color: "text-blue-700" },
          { label: "Total Enrollments", value: totals.enrollments, color: "text-purple-700" },
          { label: "Total Completions", value: totals.completions, color: "text-green-700" },
          { label: "Total CEH Issued", value: `${totals.ceh.toFixed(1)}h`, color: "text-red-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-lg p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart (CSS bar chart) */}
      <div className="bg-card border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Enrollments & Completions — Last 6 Months</h2>
        <div className="flex items-end gap-3 h-40">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end h-32">
                <div
                  className="flex-1 bg-blue-200 rounded-t-sm transition-all"
                  style={{ height: `${(m.enrollments / maxEnrollments) * 100}%`, minHeight: m.enrollments > 0 ? "4px" : "0" }}
                  title={`${m.enrollments} enrollments`}
                />
                <div
                  className="flex-1 bg-green-400 rounded-t-sm transition-all"
                  style={{ height: `${(m.completions / maxEnrollments) * 100}%`, minHeight: m.completions > 0 ? "4px" : "0" }}
                  title={`${m.completions} completions`}
                />
              </div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-200 rounded-sm inline-block" />Enrollments</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" />Completions</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top courses */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Top Courses by Enrollment</h2>
          {topCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No enrollment data yet</p>
          ) : (
            <div className="space-y-3">
              {topCourses.map((c, i) => {
                const pct = Math.round((c.enrollments / (topCourses[0]?.enrollments || 1)) * 100);
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate flex-1 mr-2">{i + 1}. {c.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span>{c.enrollments} enrolled</span>
                        <span className="text-green-700 font-medium">{c.completions} done</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completions by cert level */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Completions by Certification Level</h2>
          {certStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No completion data yet</p>
          ) : (
            <div className="space-y-3">
              {certStats.map((c) => {
                const pct = Math.round((c.count / (certStats[0]?.count || 1)) * 100);
                return (
                  <div key={c.level}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{c.level}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{c.count} completions</span>
                        <span className="text-red-700 font-medium">{c.ceh.toFixed(1)}h CEH</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

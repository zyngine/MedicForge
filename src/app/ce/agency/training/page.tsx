"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock } from "lucide-react";

interface AgencyUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  certification_level: string | null;
}

interface EnrollmentWithCourse {
  id: string;
  user_id: string;
  completion_status: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_pct: number | null;
  ce_courses: { id: string; title: string; ceh_hours: number; capce_course_number: string | null } | null;
}

export default function CEAgencyTrainingPage() {
  const [employees, setEmployees] = useState<AgencyUser[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [_courses, setCourses] = useState<{ id: string; title: string; ceh_hours: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", (await supabase.auth.getUser()).data.user?.id || "").single();
      if (!me?.agency_id) { setIsLoading(false); return; }

      const [empRes, _enrollRes, courseRes] = await Promise.all([
        supabase.from("ce_users").select("id, first_name, last_name, certification_level").eq("agency_id", me.agency_id).eq("role", "user"),
        supabase
          .from("ce_enrollments")
          .select("id, user_id, completion_status, enrolled_at, completed_at, progress_pct, ce_courses(id, title, ceh_hours, capce_course_number)")
          .in("user_id", []),  // will refetch below
        supabase.from("ce_courses").select("id, title, ceh_hours").eq("status", "published"),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const empIds = (empRes.data || []).map((e: any) => e.id);

      let enrollData: EnrollmentWithCourse[] = [];
      if (empIds.length > 0) {
        const { data } = await supabase
          .from("ce_enrollments")
          .select("id, user_id, completion_status, enrolled_at, completed_at, progress_pct, ce_courses(id, title, ceh_hours, capce_course_number)")
          .in("user_id", empIds)
          .order("enrolled_at", { ascending: false });
        enrollData = (data as EnrollmentWithCourse[]) || [];
      }

      setEmployees(empRes.data || []);
      setEnrollments(enrollData);
      setCourses(courseRes.data || []);
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const filteredEnrollments = selectedUser
    ? enrollments.filter((e) => e.user_id === selectedUser)
    : enrollments;

  const completedCount = filteredEnrollments.filter((e) => e.completion_status === "completed").length;
  const inProgressCount = filteredEnrollments.filter((e) => e.completion_status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agency Training</h1>
        <p className="text-muted-foreground text-sm mt-1">Track CE enrollment and completion across your agency</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Employees</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{employees.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Completions</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{completedCount}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{inProgressCount}</p>
        </div>
      </div>

      {/* Employee filter */}
      <div className="bg-card border rounded-lg p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">Filter by employee:</span>
        <button
          onClick={() => setSelectedUser(null)}
          className={`text-xs px-3 py-1.5 rounded-full border ${!selectedUser ? "bg-gray-900 text-white border-gray-900" : "bg-card text-muted-foreground hover:bg-muted/30"}`}
        >
          All
        </button>
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedUser(emp.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${selectedUser === emp.id ? "bg-gray-900 text-white border-gray-900" : "bg-card text-muted-foreground hover:bg-muted/30"}`}
          >
            {emp.first_name} {emp.last_name}
          </button>
        ))}
      </div>

      {/* Enrollments table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {filteredEnrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No enrollments found</p>
            <Link href="/ce/catalog" className="text-xs text-blue-700 hover:underline mt-2">Browse the course catalog</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((e) => {
                const emp = employees.find((u) => u.id === e.user_id);
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</td>
                    <td className="px-4 py-3">
                      <p>{e.ce_courses?.title}</p>
                      {e.ce_courses?.capce_course_number && <p className="text-xs text-muted-foreground font-mono">{e.ce_courses.capce_course_number}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium">{e.ce_courses?.ceh_hours}h</td>
                    <td className="px-4 py-3">
                      {e.completion_status === "completed" ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle className="h-3.5 w-3.5" />Completed</span>
                      ) : e.completion_status === "in_progress" ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-700 font-medium"><Clock className="h-3.5 w-3.5" />{e.progress_pct ?? 0}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{e.completion_status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{e.completed_at ? new Date(e.completed_at).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

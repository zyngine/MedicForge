"use client";

import { useEffect, useState, useMemo } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner, Button, Input } from "@/components/ui";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Plus, Search, Trash2, X, Lock } from "lucide-react";

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
  assigned_at: string | null;
  assigned_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  progress_percentage: number | null;
  ce_courses: { id: string; title: string; ceh_hours: number; capce_course_number: string | null } | null;
}

interface CECourse {
  id: string;
  title: string;
  category: string | null;
  ceh_hours: number;
}

interface Agency {
  id: string;
  name: string;
  subscription_tier: string | null;
}

const COVERED_TIERS = new Set(["enterprise", "enterprise_plus", "custom"]);

export default function CEAgencyTrainingPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [employees, setEmployees] = useState<AgencyUser[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [courses, setCourses] = useState<CECourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const flash = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  const load = async () => {
    const supabase = createCEClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }
    const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", user.id).single();
    if (!me?.agency_id) { setIsLoading(false); return; }

    const [agencyRes, empRes, courseRes] = await Promise.all([
      supabase.from("ce_agencies").select("id, name, subscription_tier").eq("id", me.agency_id).single(),
      supabase.from("ce_users").select("id, first_name, last_name, certification_level").eq("agency_id", me.agency_id).eq("role", "user"),
      supabase.from("ce_courses").select("id, title, category, ceh_hours").eq("status", "published").order("title"),
    ]);
    setAgency(agencyRes.data);
    setEmployees(empRes.data || []);
    setCourses(courseRes.data || []);

    const empIds = (empRes.data || []).map((e: { id: string }) => e.id);
    if (empIds.length > 0) {
      const { data } = await supabase
        .from("ce_enrollments")
        .select("id, user_id, completion_status, enrolled_at, assigned_at, assigned_by, due_date, completed_at, progress_percentage, ce_courses(id, title, ceh_hours, capce_course_number)")
        .in("user_id", empIds)
        .order("enrolled_at", { ascending: false });
      setEnrollments((data as EnrollmentWithCourse[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const tierCovers = COVERED_TIERS.has(agency?.subscription_tier ?? "");
  const filteredEnrollments = selectedUser
    ? enrollments.filter((e) => e.user_id === selectedUser)
    : enrollments;
  const assigned = filteredEnrollments.filter((e) => e.assigned_by);
  const selfEnrolled = filteredEnrollments.filter((e) => !e.assigned_by);
  const completedCount = filteredEnrollments.filter((e) => e.completion_status === "completed").length;
  const inProgressCount = filteredEnrollments.filter((e) => e.completion_status === "in_progress").length;

  const removeAssignment = async (id: string) => {
    setActionError(null);
    const res = await fetch(`/api/ce/agency/training/assignments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || "Failed to remove.");
      return;
    }
    flash(data.kept ? "Assignment removed (course kept — employee already has progress)." : "Assignment removed.");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Agency Training</h1>
          <p className="text-muted-foreground text-sm mt-1">Assign CE courses to employees and track their progress</p>
        </div>
        {tierCovers && (
          <Button onClick={() => setShowAssignModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Course
          </Button>
        )}
      </div>

      {actionNotice && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">{actionNotice}</div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{actionError}</div>
      )}

      {!tierCovers && (
        <div className="bg-card border rounded-lg p-6 flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Course assignment requires an Enterprise subscription</p>
            <p className="text-sm text-muted-foreground">
              Upgrade your agency&apos;s plan so all employees get the full CE catalog included, and you can assign courses to specific people, certifications, or everyone in the agency.
            </p>
            <Link href="/ce/contact" className="text-sm text-red-700 hover:underline inline-block mt-1">Contact us to upgrade →</Link>
          </div>
        </div>
      )}

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

      {employees.length > 0 && (
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
      )}

      <EnrollmentTable
        title="Assigned by your agency"
        rows={assigned}
        employees={employees}
        emptyMessage="Nothing assigned yet."
        onRemove={removeAssignment}
        showRemove
      />

      <EnrollmentTable
        title="Self-enrolled"
        rows={selfEnrolled}
        employees={employees}
        emptyMessage="No self-enrollments yet."
      />

      {showAssignModal && agency && (
        <AssignCourseModal
          agency={agency}
          courses={courses}
          employees={employees}
          onClose={() => setShowAssignModal(false)}
          onDone={async (msg) => {
            setShowAssignModal(false);
            flash(msg);
            await load();
          }}
          onError={(msg) => setActionError(msg)}
        />
      )}
    </div>
  );
}

function EnrollmentTable({
  title,
  rows,
  employees,
  emptyMessage,
  onRemove,
  showRemove,
}: {
  title: string;
  rows: EnrollmentWithCourse[];
  employees: AgencyUser[];
  emptyMessage: string;
  onRemove?: (id: string) => void;
  showRemove?: boolean;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      <div className="bg-card border rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
                {showRemove && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
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
                        <span className="flex items-center gap-1 text-xs text-yellow-700 font-medium"><Clock className="h-3.5 w-3.5" />{e.progress_percentage ?? 0}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{e.completion_status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {e.due_date ? new Date(e.due_date + "T00:00:00").toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{e.completed_at ? new Date(e.completed_at).toLocaleDateString() : "—"}</td>
                    {showRemove && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onRemove?.(e.id)}
                          className="p-1.5 hover:bg-muted rounded text-red-600"
                          title="Remove assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
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

function AssignCourseModal({
  agency,
  courses,
  employees,
  onClose,
  onDone,
  onError,
}: {
  agency: Agency;
  courses: CECourse[];
  employees: AgencyUser[];
  onClose: () => void;
  onDone: (msg: string) => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const [step, setStep] = useState<"course" | "targets">("course");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CECourse | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [allAgency, setAllAgency] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const certLevels = useMemo(
    () =>
      Array.from(
        new Set(employees.map((e) => e.certification_level).filter((c): c is string => !!c)),
      ).sort(),
    [employees],
  );

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const s = search.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(s) || (c.category || "").toLowerCase().includes(s));
  }, [courses, search]);

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const submit = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    const targets: { target_type: string; target_value: string | null }[] = [];
    if (allAgency) {
      targets.push({ target_type: "all_agency", target_value: null });
    } else {
      selectedUserIds.forEach((id) => targets.push({ target_type: "user", target_value: id }));
      selectedCerts.forEach((c) => targets.push({ target_type: "certification", target_value: c }));
    }
    if (targets.length === 0) {
      onError("Select at least one target.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/ce/agency/training/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: selectedCourse.id,
        targets,
        due_date: dueDate || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      onError(data.error || "Failed to assign.");
      return;
    }
    const newly = data.enrolled || 0;
    const already = data.already_enrolled || 0;
    await onDone(
      `${selectedCourse.title} assigned — ${newly} new enrollment${newly === 1 ? "" : "s"}${already ? ` (${already} already enrolled)` : ""}.`,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {step === "course" ? "Pick a Course" : `Assign — ${selectedCourse?.title ?? ""}`}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {step === "course" ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-card"
                />
              </div>
              <div className="space-y-1">
                {filteredCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No published courses match.</p>
                ) : (
                  filteredCourses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCourse(c); setStep("targets"); }}
                      className="w-full text-left p-3 border rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.category || "Uncategorized"} · {c.ceh_hours}h CEH
                      </p>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground border-t pt-3">
                All catalog courses are covered for your employees under <strong>{agency.name}</strong>&apos;s {agency.subscription_tier} tier.
              </p>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium block mb-2">Who should get this course?</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={allAgency}
                      onChange={(e) => {
                        setAllAgency(e.target.checked);
                        if (e.target.checked) { setSelectedUserIds(new Set()); setSelectedCerts(new Set()); }
                      }}
                    />
                    <span className="text-sm font-medium">Everyone in the agency ({employees.length} employees)</span>
                  </label>

                  {!allAgency && certLevels.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">By Certification Level</p>
                      <div className="flex flex-wrap gap-2">
                        {certLevels.map((cert) => {
                          const count = employees.filter((e) => e.certification_level === cert).length;
                          const active = selectedCerts.has(cert);
                          return (
                            <button
                              key={cert}
                              type="button"
                              onClick={() => setSelectedCerts(toggle(selectedCerts, cert))}
                              className={`text-xs px-3 py-1.5 rounded-full border ${
                                active ? "bg-red-700 text-white border-red-700" : "bg-card text-muted-foreground hover:bg-muted/30"
                              }`}
                            >
                              {active ? "✓ " : "+ "}All {cert} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!allAgency && (
                    <details className="border rounded-md">
                      <summary className="text-xs font-medium uppercase text-muted-foreground cursor-pointer px-3 py-2">
                        By Individual Employee ({selectedUserIds.size} selected)
                      </summary>
                      <div className="max-h-48 overflow-auto px-3 pb-3 grid grid-cols-2 gap-1">
                        {employees.map((emp) => {
                          const active = selectedUserIds.has(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => setSelectedUserIds(toggle(selectedUserIds, emp.id))}
                              className={`text-left text-xs p-2 rounded ${active ? "bg-red-700 text-white" : "hover:bg-muted/30"}`}
                            >
                              {active ? "✓ " : ""}{emp.first_name} {emp.last_name}
                              {emp.certification_level && (
                                <span className={`ml-1 ${active ? "text-red-100" : "text-muted-foreground"}`}>
                                  ({emp.certification_level})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Due date (optional)</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t bg-muted/30">
          <div>
            {step === "targets" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("course")}>← Pick a different course</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            {step === "targets" && (
              <Button onClick={submit} disabled={submitting || (!allAgency && selectedUserIds.size === 0 && selectedCerts.size === 0)}>
                {submitting ? "Assigning..." : "Assign Course"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

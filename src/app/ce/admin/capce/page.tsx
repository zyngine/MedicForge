"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react";

interface CapceStatus {
  publishedCourses: number;
  coursesWithCapce: number;
  activeMembers: number;
  medicalDirector: boolean;
  coiFormsOnFile: number;
  needsAssessmentCount: number;
  unreportedCompletions: number;
}

export default function CECapceDashboardPage() {
  const [status, setStatus] = useState<CapceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [coursesRes, membersRes, mdRes, coiRes, naRes, completionsRes, submissionsRes] = await Promise.all([
        supabase.from("ce_courses").select("id, capce_approved, status"),
        supabase.from("ce_committee_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("ce_committee_members").select("id", { count: "exact", head: true }).eq("role", "medical_director").eq("status", "active"),
        supabase.from("ce_conflict_of_interest").select("id", { count: "exact", head: true }).eq("attestation_signed", true),
        supabase.from("ce_needs_assessments").select("id", { count: "exact", head: true }),
        supabase.from("ce_enrollments").select("id", { count: "exact", head: true }).eq("completion_status", "completed"),
        supabase.from("ce_capce_submission_records").select("id", { count: "exact", head: true }).eq("status", "reported"),
      ]);

      const courses = (coursesRes.data || []) as { id: string; status: string; capce_approved: boolean | null }[];
      const totalCompletions = completionsRes.count || 0;
      const reportedCompletions = submissionsRes.count || 0;

      setStatus({
        publishedCourses: courses.filter((c) => c.status === "published").length,
        coursesWithCapce: courses.filter((c) => c.capce_approved).length,
        activeMembers: membersRes.count || 0,
        medicalDirector: (mdRes.count || 0) > 0,
        coiFormsOnFile: coiRes.count || 0,
        needsAssessmentCount: naRes.count || 0,
        unreportedCompletions: Math.max(0, totalCompletions - reportedCompletions),
      });
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const checks = [
    { label: "Program Committee (≥3 active members)", pass: (status?.activeMembers || 0) >= 3, detail: `${status?.activeMembers} active`, href: "/ce/admin/committee/members" },
    { label: "Medical Director on committee", pass: status?.medicalDirector, detail: status?.medicalDirector ? "Assigned" : "None assigned", href: "/ce/admin/committee/members" },
    { label: "COI forms on file", pass: (status?.coiFormsOnFile || 0) > 0, detail: `${status?.coiFormsOnFile} signed`, href: "/ce/admin/committee/coi" },
    { label: "Needs assessments documented", pass: (status?.needsAssessmentCount || 0) > 0, detail: `${status?.needsAssessmentCount} on record`, href: "/ce/admin/committee/needs-assessment" },
    { label: "CAPCE-approved courses published", pass: (status?.coursesWithCapce || 0) > 0, detail: `${status?.coursesWithCapce} approved`, href: "/ce/admin/courses" },
    { label: "All completions reported to NREMT", pass: (status?.unreportedCompletions || 0) === 0, detail: status?.unreportedCompletions ? `${status.unreportedCompletions} unreported` : "Up to date", href: "/ce/admin/capce/reporting" },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const ready = passCount === checks.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">CAPCE Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Commission on Accreditation for Pre-Hospital Continuing Education</p>
      </div>

      {/* Overall status */}
      <div className={`rounded-lg border p-5 ${ready ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
        <div className="flex items-center gap-3">
          {ready
            ? <CheckCircle className="h-8 w-8 text-green-600" />
            : <AlertCircle className="h-8 w-8 text-yellow-600" />}
          <div>
            <p className={`font-semibold text-lg ${ready ? "text-green-800" : "text-yellow-800"}`}>
              {ready ? "Accreditation Ready" : `${passCount} of ${checks.length} requirements met`}
            </p>
            <p className={`text-sm ${ready ? "text-green-700" : "text-yellow-700"}`}>
              {ready ? "All CAPCE requirements are satisfied." : "Address the items below before applying for accreditation."}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Accreditation Checklist</h2>
        <div className="bg-white border rounded-lg divide-y">
          {checks.map((check) => (
            <Link key={check.label} href={check.href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                {check.pass
                  ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className={`text-xs ${check.pass ? "text-green-700" : "text-red-600"}`}>{check.detail}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "Reporting", desc: "Generate NREMT completion reports", href: "/ce/admin/capce/reporting" },
          { title: "Submissions", desc: "Track submitted reports", href: "/ce/admin/capce/submissions" },
          { title: "Audit Prep", desc: "Checklist for accreditation audit", href: "/ce/admin/capce/audit" },
        ].map(({ title, desc, href }) => (
          <Link key={href} href={href} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow group">
            <p className="font-medium text-sm mb-1">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

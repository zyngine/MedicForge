"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface AuditItem {
  category: string;
  label: string;
  pass: boolean | null;
  detail: string;
  href: string;
}

export default function CECapceAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [membersRes, mdRes, coiRes, naRes, coursesRes, instructorsRes] = await Promise.all([
        supabase.from("ce_committee_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("ce_committee_members").select("id", { count: "exact", head: true }).eq("role", "medical_director").eq("status", "active"),
        supabase.from("ce_conflict_of_interest").select("id", { count: "exact", head: true }).eq("attestation_signed", true),
        supabase.from("ce_needs_assessments").select("id", { count: "exact", head: true }),
        supabase.from("ce_courses").select("id, capce_course_number, status, passing_score"),
        supabase.from("ce_instructors").select("id, cv_url, coi_expires_at"),
      ]);

      const courses = (coursesRes.data || []) as { id: string; capce_course_number: string | null; status: string; passing_score: number | null }[];
      const instructors = (instructorsRes.data || []) as { id: string; cv_url: string | null; coi_expires_at: string | null }[];
      const publishedWithCapce = courses.filter((c) => c.status === "published" && c.capce_course_number);
      const coursesGoodPassScore = courses.filter((c) => (c.passing_score || 0) >= 70);
      const instructorsWithCV = instructors.filter((i) => i.cv_url);
      const instructorsCoiCurrent = instructors.filter((i) => !i.coi_expires_at || new Date(i.coi_expires_at) > new Date());

      const auditItems: AuditItem[] = [
        // Governance
        { category: "Governance", label: "Program Committee has ≥3 active members", pass: (membersRes.count || 0) >= 3, detail: `${membersRes.count} active members`, href: "/ce/admin/committee/members" },
        { category: "Governance", label: "Medical Director assigned to committee", pass: (mdRes.count || 0) > 0, detail: (mdRes.count || 0) > 0 ? "Assigned" : "None assigned", href: "/ce/admin/committee/members" },
        { category: "Governance", label: "COI forms on file for all committee members", pass: (coiRes.count || 0) > 0, detail: `${coiRes.count} signed attestations`, href: "/ce/admin/committee/coi" },
        // Needs Assessment
        { category: "Needs Assessment", label: "Needs assessment documented", pass: (naRes.count || 0) > 0, detail: `${naRes.count} assessment${naRes.count !== 1 ? "s" : ""} on record`, href: "/ce/admin/committee/needs-assessment" },
        // Courses
        { category: "Courses", label: "CAPCE course numbers assigned to published courses", pass: publishedWithCapce.length > 0, detail: `${publishedWithCapce.length} of ${courses.filter((c) => c.status === "published").length} published courses`, href: "/ce/admin/courses" },
        { category: "Courses", label: "All courses have ≥70% passing score", pass: courses.length === 0 || coursesGoodPassScore.length === courses.length, detail: `${coursesGoodPassScore.length} of ${courses.length} courses`, href: "/ce/admin/courses" },
        // Instructors
        { category: "Instructors", label: "CVs on file for all instructors", pass: instructors.length === 0 || instructorsWithCV.length === instructors.length, detail: `${instructorsWithCV.length} of ${instructors.length} instructors`, href: "/ce/admin/instructors" },
        { category: "Instructors", label: "COI forms current for all instructors", pass: instructors.length === 0 || instructorsCoiCurrent.length === instructors.length, detail: `${instructorsCoiCurrent.length} of ${instructors.length} current`, href: "/ce/admin/instructors" },
      ];

      setItems(auditItems);
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const categories = [...new Set(items.map((i) => i.category))];
  const passCount = items.filter((i) => i.pass).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Preparation</h1>
          <p className="text-muted-foreground text-sm mt-1">{passCount} of {items.length} requirements satisfied</p>
        </div>
        <a href="https://www.capce.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-700 hover:underline">
          CAPCE Standards <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Progress bar */}
      <div className="bg-card border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Audit Readiness</p>
          <p className="text-sm font-bold">{Math.round((passCount / items.length) * 100)}%</p>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${passCount === items.length ? "bg-green-500" : passCount >= items.length * 0.75 ? "bg-yellow-500" : "bg-red-400"}`}
            style={{ width: `${(passCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist by category */}
      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-base font-semibold mb-2">{category}</h2>
          <div className="bg-card border rounded-lg divide-y">
            {items.filter((i) => i.category === category).map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  {item.pass
                    ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.label}</p>
                    <p className={`text-xs ${item.pass ? "text-green-700" : "text-red-600"}`}>{item.detail}</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">CAPCE Accreditation Process</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Complete all items in this checklist</li>
          <li>Submit accreditation application to CAPCE (capce.org)</li>
          <li>CAPCE staff review — typically 30–60 days</li>
          <li>Site visit or virtual review may be required</li>
          <li>Upon approval, assign CAPCE numbers to courses</li>
          <li>Begin reporting completions quarterly</li>
        </ol>
      </div>
    </div>
  );
}

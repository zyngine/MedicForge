"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface CourseReview {
  id: string;
  course_id: string;
  decision: string | null;
  votes_for: number | null;
  votes_against: number | null;
  votes_abstain: number | null;
  medical_director_approved: boolean | null;
  notes: string | null;
  revisions_required: string | null;
  reviewed_at: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  ceh_hours: number;
  passing_score: number | null;
  capce_number: string | null;
  ce_users: { first_name: string; last_name: string } | null;
}

const CAPCE_CHECKLIST = [
  "Learning objectives are clearly stated and measurable",
  "Content aligns with identified needs assessment",
  "Content is evidence-based / references cited",
  "Passing score is ≥70%",
  "CEH hours are appropriate for content",
  "No commercial bias or promotional content",
  "Pre/post assessment included",
  "Instructor credentials are appropriate",
];

export default function CECommitteeCourseReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [existingReview, setExistingReview] = useState<CourseReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    decision: "",
    votes_for: "",
    votes_against: "",
    votes_abstain: "",
    medical_director_approved: false,
    notes: "",
    revisions_required: "",
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const [courseRes, reviewRes] = await Promise.all([
        supabase.from("ce_courses").select("id, title, description, status, ceh_hours, passing_score, capce_number, ce_users(first_name, last_name)").eq("id", courseId).single(),
        supabase.from("ce_committee_reviews").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCourse(courseRes.data as Course | null);
      if (reviewRes.data) {
        setExistingReview(reviewRes.data);
        setForm({
          decision: reviewRes.data.decision || "",
          votes_for: reviewRes.data.votes_for?.toString() || "",
          votes_against: reviewRes.data.votes_against?.toString() || "",
          votes_abstain: reviewRes.data.votes_abstain?.toString() || "",
          medical_director_approved: reviewRes.data.medical_director_approved || false,
          notes: reviewRes.data.notes || "",
          revisions_required: reviewRes.data.revisions_required || "",
        });
      }
      setIsLoading(false);
    };
    if (courseId) load();
  }, [courseId]);

  const submit = async () => {
    if (!form.decision || !course) return;
    setSaving(true);
    const supabase = createCEClient();

    const reviewPayload = {
      course_id: courseId,
      decision: form.decision,
      votes_for: form.votes_for ? parseInt(form.votes_for) : null,
      votes_against: form.votes_against ? parseInt(form.votes_against) : null,
      votes_abstain: form.votes_abstain ? parseInt(form.votes_abstain) : null,
      medical_director_approved: form.medical_director_approved,
      notes: form.notes || null,
      revisions_required: form.revisions_required || null,
      reviewed_at: new Date().toISOString(),
    };

    if (existingReview) {
      await supabase.from("ce_committee_reviews").update(reviewPayload).eq("id", existingReview.id);
    } else {
      await supabase.from("ce_committee_reviews").insert(reviewPayload);
    }

    const statusMap: Record<string, string> = {
      approved: "approved",
      approved_with_revisions: "revisions_requested",
      tabled: "pending_committee_review",
      rejected: "draft",
    };
    await supabase.from("ce_courses").update({ status: statusMap[form.decision] || course.status }).eq("id", courseId);

    setSaving(false);
    router.push("/ce/admin/committee/reviews");
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!course) return <div className="p-8 text-center text-muted-foreground">Course not found.</div>;

  const checklistPassed = CAPCE_CHECKLIST.filter((item) => checklist[item]).length;
  const allChecked = checklistPassed === CAPCE_CHECKLIST.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Course Review</h1>
        <p className="text-muted-foreground text-sm mt-1">{course.title}</p>
      </div>

      {/* Course summary */}
      <div className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-sm">Course Details</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">CEH Hours</p>
            <p className="font-medium">{course.ceh_hours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Passing Score</p>
            <p className={`font-medium ${(course.passing_score || 0) < 70 ? "text-red-600" : ""}`}>{course.passing_score ?? "—"}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">CAPCE Number</p>
            <p className="font-medium font-mono text-xs">{course.capce_number || "Not assigned"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Author</p>
            <p className="font-medium">
              {course.ce_users ? `${(course.ce_users as any).first_name} ${(course.ce_users as any).last_name}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Current Status</p>
            <p className="font-medium capitalize">{course.status.replace(/_/g, " ")}</p>
          </div>
        </div>
        {course.description && <p className="text-sm text-muted-foreground border-t pt-3">{course.description}</p>}
      </div>

      {/* CAPCE compliance checklist */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">CAPCE Compliance Checklist</h2>
          <span className={`text-xs font-medium ${allChecked ? "text-green-700" : "text-muted-foreground"}`}>
            {checklistPassed}/{CAPCE_CHECKLIST.length} items
          </span>
        </div>
        <div className="space-y-2">
          {CAPCE_CHECKLIST.map((item) => (
            <label key={item} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!checklist[item]}
                onChange={(e) => setChecklist({ ...checklist, [item]: e.target.checked })}
                className="mt-0.5 rounded shrink-0"
              />
              <span className={`text-sm flex-1 ${checklist[item] ? "text-green-700" : ""}`}>{item}</span>
              {checklist[item]
                ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400" />}
            </label>
          ))}
        </div>
        {!allChecked && (
          <p className="text-xs text-yellow-700 mt-3 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Complete the checklist before recording a decision.
          </p>
        )}
      </div>

      {/* Vote & decision */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-sm">Committee Decision</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Decision</label>
            <select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Select decision...</option>
              <option value="approved">Approved</option>
              <option value="approved_with_revisions">Approved with Revisions</option>
              <option value="tabled">Tabled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Votes For</label>
            <Input type="number" min="0" value={form.votes_for} onChange={(e) => setForm({ ...form, votes_for: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Votes Against</label>
            <Input type="number" min="0" value={form.votes_against} onChange={(e) => setForm({ ...form, votes_against: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Abstentions</label>
            <Input type="number" min="0" value={form.votes_abstain} onChange={(e) => setForm({ ...form, votes_abstain: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="md_approval"
              checked={form.medical_director_approved}
              onChange={(e) => setForm({ ...form, medical_director_approved: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="md_approval" className="text-sm font-medium">Medical Director approved</label>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="Committee discussion notes..."
            />
          </div>
          {(form.decision === "approved_with_revisions" || form.decision === "rejected") && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Revisions Required</label>
              <textarea
                value={form.revisions_required}
                onChange={(e) => setForm({ ...form, revisions_required: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="List specific changes required..."
              />
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={submit} disabled={saving || !form.decision}>
            {saving ? "Saving..." : existingReview ? "Update Decision" : "Record Decision"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/ce/admin/committee/reviews")}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

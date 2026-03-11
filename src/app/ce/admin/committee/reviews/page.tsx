"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner, Select } from "@/components/ui";
import { BookOpen, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface ReviewRecord {
  id: string;
  course_id: string;
  review_type: string;
  committee_decision: string | null;
  medical_director_approved: boolean | null;
  created_at: string;
  ce_courses: { title: string; category: string | null; ceh_hours: number } | null;
  ce_committee_meetings: { meeting_date: string } | null;
}

interface PendingCourse {
  id: string;
  title: string;
  category: string | null;
  ceh_hours: number;
  created_at: string;
}

const DECISION_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  approved_with_revisions: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  tabled: "bg-yellow-100 text-yellow-800",
};

const DECISION_LABELS: Record<string, string> = {
  approved: "Approved",
  approved_with_revisions: "Approved w/ Revisions",
  rejected: "Rejected",
  tabled: "Tabled",
};

export default function CECommitteeReviewsPage() {
  const [pending, setPending] = useState<PendingCourse[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    review_type: "initial",
    committee_decision: "",
    committee_notes: "",
    revisions_required: "",
    medical_director_approved: "",
    committee_vote_for: "",
    committee_vote_against: "",
    committee_vote_abstain: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    const supabase = createCEClient();
    const [pendingRes, reviewsRes] = await Promise.all([
      supabase
        .from("ce_courses")
        .select("id, title, category, ceh_hours, created_at")
        .eq("status", "pending_committee_review")
        .order("created_at"),
      supabase
        .from("ce_committee_course_reviews")
        .select("id, course_id, review_type, committee_decision, medical_director_approved, created_at, ce_courses(title, category, ceh_hours), ce_committee_meetings(meeting_date)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setPending((pendingRes.data as PendingCourse[]) || []);
    setReviews((reviewsRes.data as ReviewRecord[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmitReview = async (courseId: string) => {
    if (!reviewForm.committee_decision) { setSaveError("A committee decision is required."); return; }
    setSaving(true);
    setSaveError(null);
    const supabase = createCEClient();

    const { error: reviewError } = await supabase.from("ce_committee_course_reviews").insert({
      course_id: courseId,
      review_type: reviewForm.review_type,
      committee_decision: reviewForm.committee_decision,
      committee_notes: reviewForm.committee_notes || null,
      revisions_required: reviewForm.revisions_required || null,
      medical_director_approved: reviewForm.medical_director_approved === "true" ? true : reviewForm.medical_director_approved === "false" ? false : null,
      committee_vote_for: reviewForm.committee_vote_for ? parseInt(reviewForm.committee_vote_for) : null,
      committee_vote_against: reviewForm.committee_vote_against ? parseInt(reviewForm.committee_vote_against) : null,
      committee_vote_abstain: reviewForm.committee_vote_abstain ? parseInt(reviewForm.committee_vote_abstain) : null,
    });

    if (reviewError) { setSaveError("Failed to save review."); setSaving(false); return; }

    // Update course status
    let newStatus = "approved";
    if (reviewForm.committee_decision === "approved_with_revisions") newStatus = "revisions_requested";
    if (reviewForm.committee_decision === "rejected") newStatus = "draft";
    if (reviewForm.committee_decision === "tabled") newStatus = "pending_committee_review";

    if (reviewForm.committee_decision !== "tabled") {
      await supabase.from("ce_courses").update({ status: newStatus }).eq("id", courseId);
    }

    setReviewingId(null);
    setReviewForm({ review_type: "initial", committee_decision: "", committee_notes: "", revisions_required: "", medical_director_approved: "", committee_vote_for: "", committee_vote_against: "", committee_vote_abstain: "" });
    load();
    setSaving(false);
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Course Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">Committee review queue and history</p>
      </div>

      {/* Pending review queue */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
            <p className="text-sm">No courses pending review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((course) => (
              <div key={course.id} className="bg-white border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground">{course.category || "Uncategorized"} · {course.ceh_hours}h CEH · Submitted {new Date(course.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/ce/admin/courses/${course.id}`} className="text-xs text-muted-foreground hover:underline">
                      View Course
                    </Link>
                    <button
                      onClick={() => { setReviewingId(reviewingId === course.id ? null : course.id); setSaveError(null); }}
                      className="text-sm font-medium text-red-700 hover:underline"
                    >
                      {reviewingId === course.id ? "Cancel" : "Record Review"}
                    </button>
                  </div>
                </div>

                {reviewingId === course.id && (
                  <div className="border-t bg-gray-50 px-5 py-4 space-y-4">
                    {saveError && (
                      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Review Type</label>
                        <Select
                          value={reviewForm.review_type}
                          onChange={(v) => setReviewForm((p) => ({ ...p, review_type: v }))}
                          options={[{ value: "initial", label: "Initial Review" }, { value: "revision", label: "Revision Review" }, { value: "annual", label: "Annual Review" }]}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Committee Decision *</label>
                        <Select
                          value={reviewForm.committee_decision}
                          onChange={(v) => setReviewForm((p) => ({ ...p, committee_decision: v }))}
                          options={[
                            { value: "", label: "Select decision..." },
                            { value: "approved", label: "Approved" },
                            { value: "approved_with_revisions", label: "Approved with Revisions" },
                            { value: "tabled", label: "Tabled" },
                            { value: "rejected", label: "Rejected" },
                          ]}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Medical Director Approval</label>
                        <Select
                          value={reviewForm.medical_director_approved}
                          onChange={(v) => setReviewForm((p) => ({ ...p, medical_director_approved: v }))}
                          options={[{ value: "", label: "Not reviewed" }, { value: "true", label: "Approved" }, { value: "false", label: "Not Approved" }]}
                        />
                      </div>
                      <div />
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Votes For</label>
                        <input type="number" min="0" value={reviewForm.committee_vote_for} onChange={(e) => setReviewForm((p) => ({ ...p, committee_vote_for: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Votes Against</label>
                        <input type="number" min="0" value={reviewForm.committee_vote_against} onChange={(e) => setReviewForm((p) => ({ ...p, committee_vote_against: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Committee Notes</label>
                      <textarea value={reviewForm.committee_notes} onChange={(e) => setReviewForm((p) => ({ ...p, committee_notes: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Notes from committee discussion..." />
                    </div>
                    {(reviewForm.committee_decision === "approved_with_revisions") && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Revisions Required</label>
                        <textarea value={reviewForm.revisions_required} onChange={(e) => setReviewForm((p) => ({ ...p, revisions_required: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Describe required revisions..." />
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmitReview(course.id)}
                        disabled={saving}
                        className="bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-800 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Submit Review"}
                      </button>
                      <button onClick={() => setReviewingId(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review history */}
      {reviews.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Review History</h2>
          <div className="bg-white border rounded-lg divide-y">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.ce_courses?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.ce_courses?.category} · {r.review_type} · {new Date(r.created_at).toLocaleDateString()}
                    {r.ce_committee_meetings && ` · Meeting: ${new Date(r.ce_committee_meetings.meeting_date + "T00:00:00").toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.medical_director_approved === true && <CheckCircle className="h-4 w-4 text-green-500" title="MD Approved" />}
                  {r.medical_director_approved === false && <XCircle className="h-4 w-4 text-red-500" title="MD Not Approved" />}
                  {r.committee_decision && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_STYLES[r.committee_decision] || "bg-gray-100 text-gray-700"}`}>
                      {DECISION_LABELS[r.committee_decision] || r.committee_decision}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

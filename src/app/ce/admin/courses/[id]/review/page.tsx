"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Course {
  id: string;
  title: string;
  status: string;
  ceh_hours: number;
  passing_score: number | null;
  capce_course_number: string | null;
  description: string | null;
  ce_course_objectives: { objective_text: string }[];
  ce_course_references: { citation: string }[];
  ce_course_instructors: { ce_instructors: { cv_url: string | null; coi_expires_at: string | null } | null }[];
}

const PRE_SUBMIT_CHECKLIST = [
  { key: "objectives", label: "Learning objectives are documented" },
  { key: "description", label: "Course description is complete" },
  { key: "passing_score", label: "Passing score is set to ≥70%" },
  { key: "ceh", label: "CEH hours are set" },
  { key: "instructor", label: "At least one instructor is assigned" },
  { key: "instructor_cv", label: "Instructor CV is on file" },
  { key: "instructor_coi", label: "Instructor COI is current" },
];

export default function CEAdminCourseReviewSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data } = await supabase
        .from("ce_courses")
        .select(`
          id, title, status, ceh_hours, passing_score, capce_course_number, description,
          ce_course_objectives(objective_text),
          ce_course_references(citation),
          ce_course_instructors(ce_instructors(cv_url, coi_expires_at))
        `)
        .eq("id", courseId)
        .single();
      setCourse(data as Course | null);
      setIsLoading(false);
    };
    if (courseId) load();
  }, [courseId]);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!course) return <div className="p-8 text-center text-muted-foreground">Course not found.</div>;

  const instructors = course.ce_course_instructors || [];
  const hasInstructor = instructors.length > 0;
  const allHaveCV = hasInstructor && instructors.every((ci) => ci.ce_instructors?.cv_url);
  const allCoiCurrent = hasInstructor && instructors.every((ci) => {
    const exp = ci.ce_instructors?.coi_expires_at;
    return !exp || new Date(exp) > new Date();
  });

  const checks: Record<string, boolean> = {
    objectives: (course.ce_course_objectives || []).length > 0,
    description: !!course.description?.trim(),
    passing_score: (course.passing_score || 0) >= 70,
    ceh: (course.ceh_hours || 0) > 0,
    instructor: hasInstructor,
    instructor_cv: allHaveCV,
    instructor_coi: allCoiCurrent,
  };

  const allPass = Object.values(checks).every(Boolean);
  const alreadySubmitted = course.status === "pending_committee_review";

  const submit = async () => {
    setSubmitting(true);
    const supabase = createCEClient();
    await supabase.from("ce_courses").update({ status: "pending_committee_review" }).eq("id", courseId);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Submit for Committee Review</h1>
        <p className="text-muted-foreground text-sm mt-1">{course.title}</p>
      </div>

      {alreadySubmitted || submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Submitted for review</p>
            <p className="text-sm text-green-700 mt-1">The Program Committee will review this course. You will be notified of the decision.</p>
          </div>
        </div>
      ) : null}

      <div className="bg-card border rounded-lg p-5">
        <h2 className="font-semibold text-sm mb-3">Pre-submission Checklist</h2>
        <div className="space-y-2">
          {PRE_SUBMIT_CHECKLIST.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              {checks[key]
                ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
              <span className={`text-sm ${checks[key] ? "text-green-700" : "text-red-600"}`}>{label}</span>
            </div>
          ))}
        </div>
        {!allPass && (
          <div className="mt-4 flex items-start gap-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Complete all checklist items before submitting for committee review.</span>
          </div>
        )}
      </div>

      {!alreadySubmitted && !submitted && (
        <div className="bg-card border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">Submit</h2>
          <p className="text-sm text-muted-foreground">
            Submitting will change the course status to <strong>Pending Committee Review</strong>. The Program Committee will evaluate the course against CAPCE standards and record their decision.
          </p>
          <div className="flex gap-3">
            <Button onClick={submit} disabled={submitting || !allPass}>
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

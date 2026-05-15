"use client";

import * as React from "react";
import { Button, Input, Textarea, Modal, ModalFooter, Label, Select } from "@/components/ui";
import { useUser } from "@/lib/hooks/use-user";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectType?: "preceptor" | "student" | "site" | "other";
  defaultSubjectName?: string;
  defaultBookingId?: string;
  defaultCourseId?: string;
  onSubmitted?: () => void;
}

const CATEGORIES = [
  { value: "behavior", label: "Behavior / professionalism" },
  { value: "safety", label: "Patient safety concern" },
  { value: "attendance", label: "Attendance / no-show" },
  { value: "communication", label: "Communication / feedback" },
  { value: "other", label: "Other" },
];

const SUBJECT_TYPES = [
  { value: "preceptor", label: "Preceptor" },
  { value: "student", label: "Student" },
  { value: "site", label: "Clinical site" },
  { value: "other", label: "Other" },
];

export function FileComplaintModal({
  isOpen,
  onClose,
  defaultSubjectType,
  defaultSubjectName,
  defaultBookingId,
  defaultCourseId,
  onSubmitted,
}: Props) {
  const { profile } = useUser();
  const isStudent = profile?.role === "student";

  const [subjectType, setSubjectType] = React.useState<string>(defaultSubjectType || "preceptor");
  const [subjectName, setSubjectName] = React.useState(defaultSubjectName || "");
  const [category, setCategory] = React.useState<string>("behavior");
  const [description, setDescription] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSubjectType(defaultSubjectType || "preceptor");
      setSubjectName(defaultSubjectName || "");
      setCategory("behavior");
      setDescription("");
      setIsAnonymous(false);
      setError(null);
      setDone(false);
    }
  }, [isOpen, defaultSubjectType, defaultSubjectName]);

  const submit = async () => {
    if (description.trim().length < 10) {
      setError("Please provide at least a few sentences describing what happened.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/clinical/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_type: subjectType,
        subject_name: subjectName.trim() || null,
        category,
        description: description.trim(),
        is_anonymous: isStudent ? isAnonymous : false,
        booking_id: defaultBookingId || null,
        course_id: defaultCourseId || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to file complaint.");
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    onSubmitted?.();
  };

  if (done) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Complaint filed" size="md">
        <div className="space-y-4 py-4">
          <p className="text-sm">
            Thanks — your complaint has been recorded and the relevant instructors and program administrators have been notified.
          </p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be notified when it&apos;s reviewed. For urgent safety concerns, please also contact your program coordinator directly.
          </p>
        </div>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File a clinical complaint" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use this for behavior, safety, attendance, or communication concerns about a preceptor, student, or clinical site. The course&apos;s instructors and program administrators will be notified immediately.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="subject_type">This complaint is about</Label>
            <Select
              id="subject_type"
              value={subjectType}
              onChange={(v) => setSubjectType(v)}
              options={SUBJECT_TYPES}
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={category}
              onChange={(v) => setCategory(v)}
              options={CATEGORIES}
            />
          </div>
        </div>

        {(subjectType === "preceptor" || subjectType === "site" || subjectType === "other") && (
          <div>
            <Label htmlFor="subject_name">
              {subjectType === "preceptor" ? "Preceptor name" : subjectType === "site" ? "Site name" : "Subject"}
            </Label>
            <Input
              id="subject_name"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder={subjectType === "preceptor" ? "Dr. Jane Smith" : "Memorial Hospital"}
              disabled={submitting}
            />
          </div>
        )}

        <div>
          <Label htmlFor="description" required>What happened?</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, when, and any specifics that would help your instructors understand the situation."
            rows={6}
            disabled={submitting}
          />
        </div>

        {isStudent && (
          <label className="flex items-start gap-2 text-sm bg-muted/30 border rounded p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>File anonymously.</strong> Instructors won&apos;t see who filed this complaint, but program administrators will (so they can follow up if needed). Use this if you&apos;re worried about retaliation.
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "File Complaint"}</Button>
      </ModalFooter>
    </Modal>
  );
}

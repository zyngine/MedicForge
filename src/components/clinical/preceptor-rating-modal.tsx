"use client";

import * as React from "react";
import { Button, Input, Textarea, Modal, ModalFooter, Label } from "@/components/ui";
import { Star } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  defaultPreceptorName?: string;
  onSaved?: () => void;
}

interface RatingRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}

function RatingRow({ label, value, onChange, hint }: RatingRowProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`p-1 rounded transition-colors ${value >= n ? "text-yellow-500" : "text-gray-300 hover:text-gray-400"}`}
            aria-label={`${label} ${n} star${n === 1 ? "" : "s"}`}
          >
            <Star className="h-6 w-6" fill={value >= n ? "currentColor" : "none"} />
          </button>
        ))}
        {value > 0 && <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PreceptorRatingModal({ isOpen, onClose, bookingId, defaultPreceptorName, onSaved }: Props) {
  const [preceptorName, setPreceptorName] = React.useState(defaultPreceptorName || "");
  const [knowledge, setKnowledge] = React.useState(0);
  const [communication, setCommunication] = React.useState(0);
  const [professionalism, setProfessionalism] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPreceptorName(defaultPreceptorName || "");
      setKnowledge(0);
      setCommunication(0);
      setProfessionalism(0);
      setComment("");
      setError(null);
    }
  }, [isOpen, defaultPreceptorName]);

  const submit = async () => {
    if (!preceptorName.trim()) { setError("Preceptor name is required."); return; }
    if (!knowledge || !communication || !professionalism) {
      setError("Please rate all three dimensions.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/clinical/preceptor-ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId || null,
        preceptor_name: preceptorName.trim(),
        knowledge_rating: knowledge,
        communication_rating: communication,
        professionalism_rating: professionalism,
        overall_comment: comment.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save rating.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate your preceptor" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your ratings help your program identify excellent preceptors and flag concerns. Ratings are aggregated — instructors see the preceptor&apos;s average, not your individual scores.
        </p>

        <div>
          <Label htmlFor="preceptor_name" required>Preceptor name</Label>
          <Input
            id="preceptor_name"
            value={preceptorName}
            onChange={(e) => setPreceptorName(e.target.value)}
            placeholder="Dr. Jane Smith"
            disabled={submitting}
          />
        </div>

        <RatingRow
          label="Clinical knowledge"
          value={knowledge}
          onChange={setKnowledge}
          hint="Were they technically competent and able to teach what you needed to learn?"
        />
        <RatingRow
          label="Communication"
          value={communication}
          onChange={setCommunication}
          hint="Did they explain clearly, give useful feedback, and listen to questions?"
        />
        <RatingRow
          label="Professionalism"
          value={professionalism}
          onChange={setProfessionalism}
          hint="Were they respectful, prepared, and a good role model for patient care?"
        />

        <div>
          <Label htmlFor="comment">Comments (optional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything specific the program should know about this preceptor — positive or negative."
            rows={3}
            disabled={submitting}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Rating"}</Button>
      </ModalFooter>
    </Modal>
  );
}

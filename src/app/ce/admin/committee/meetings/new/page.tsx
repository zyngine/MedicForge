"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Input, Select, Alert } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

const MEETING_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "special", label: "Special" },
  { value: "emergency", label: "Emergency" },
];

export default function CECommitteeNewMeetingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    meeting_date: "",
    start_time: "",
    end_time: "",
    location: "Video Conference",
    meeting_type: "regular",
    old_business: "",
    new_business: "",
    needs_assessment_notes: "",
    next_meeting_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.meeting_date) { setError("Meeting date is required."); return; }
    setSaving(true);
    setError(null);

    const supabase = createCEClient();
    const { data: user } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("ce_committee_meetings")
      .insert({
        meeting_date: form.meeting_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || "Video Conference",
        meeting_type: form.meeting_type,
        status: "scheduled",
        old_business: form.old_business || null,
        new_business: form.new_business || null,
        needs_assessment_notes: form.needs_assessment_notes || null,
        next_meeting_date: form.next_meeting_date || null,
        created_by: user.user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError("Failed to schedule meeting. Please try again.");
      setSaving(false);
      return;
    }

    router.push(`/ce/admin/committee/meetings/${data.id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ce/admin/committee/meetings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Schedule Meeting</h1>
          <p className="text-muted-foreground text-sm">Create a new Program Committee meeting</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & time */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Date & Time</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Date *</label>
              <Input type="date" value={form.meeting_date} onChange={(e) => setForm((p) => ({ ...p, meeting_date: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Type</label>
              <Select value={form.meeting_type} onChange={(v) => setForm((p) => ({ ...p, meeting_type: v }))} options={MEETING_TYPES} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Time</label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Time</label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Location</label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Video Conference" />
          </div>
        </div>

        {/* Agenda */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Agenda Items</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium">Old Business</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Items carried over from previous meeting..."
              value={form.old_business}
              onChange={(e) => setForm((p) => ({ ...p, old_business: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">New Business</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="New agenda items, course reviews to conduct..."
              value={form.new_business}
              onChange={(e) => setForm((p) => ({ ...p, new_business: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Needs Assessment Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="CAPCE requires periodic needs assessment discussion..."
              value={form.needs_assessment_notes}
              onChange={(e) => setForm((p) => ({ ...p, needs_assessment_notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Next meeting */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Next Meeting</h2>
          <div className="space-y-1 max-w-xs">
            <label className="text-sm font-medium">Tentative Next Meeting Date</label>
            <Input type="date" value={form.next_meeting_date} onChange={(e) => setForm((p) => ({ ...p, next_meeting_date: e.target.value }))} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Scheduling..." : "Schedule Meeting"}</Button>
          <Link href="/ce/admin/committee/meetings">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

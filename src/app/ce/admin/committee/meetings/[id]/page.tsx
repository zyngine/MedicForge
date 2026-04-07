"use client";

/* eslint-disable react-hooks/exhaustive-deps */

 

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Select, Input } from "@/components/ui";
import { ArrowLeft, CheckCircle, Circle, Plus, X, Check } from "lucide-react";

interface Meeting {
  id: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  meeting_type: string;
  status: string;
  quorum_present: boolean;
  minutes_approved: boolean;
  previous_minutes_approved: boolean;
  old_business: string | null;
  new_business: string | null;
  needs_assessment_notes: string | null;
  next_meeting_date: string | null;
  adjourned_at: string | null;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

interface Attendance {
  id: string;
  member_id: string;
  present: boolean;
  notes: string | null;
}

interface Motion {
  id: string;
  motion_text: string;
  motion_type: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  passed: boolean | null;
  notes: string | null;
  moved_by: string | null;
  seconded_by: string | null;
}

interface ActionItem {
  id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
}

type Tab = "overview" | "attendance" | "motions" | "actions";

export default function CECommitteeMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const _router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Motion form
  const [showMotionForm, setShowMotionForm] = useState(false);
  const [motionForm, setMotionForm] = useState({ motion_text: "", motion_type: "other", votes_for: "", votes_against: "", votes_abstain: "", passed: "", notes: "" });

  // Action item form
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ description: "", assigned_to: "", due_date: "", notes: "" });

  const load = async () => {
    const supabase = createCEClient();
    const [meetingRes, membersRes, attendanceRes, motionsRes, actionsRes] = await Promise.all([
      supabase.from("ce_committee_meetings").select("*").eq("id", id).single(),
      supabase.from("ce_committee_members").select("id, name, role").eq("status", "active").order("role").order("name"),
      supabase.from("ce_committee_meeting_attendance").select("*").eq("meeting_id", id),
      supabase.from("ce_committee_meeting_motions").select("*").eq("meeting_id", id).order("created_at"),
      supabase.from("ce_committee_action_items").select("*").eq("meeting_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    ]);

    setMeeting(meetingRes.data as Meeting);
    setMembers((membersRes.data as Member[]) || []);
    setAttendance((attendanceRes.data as Attendance[]) || []);
    setMotions((motionsRes.data as Motion[]) || []);
    setActionItems((actionsRes.data as ActionItem[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const toggleAttendance = async (memberId: string) => {
    const supabase = createCEClient();
    const existing = attendance.find((a) => a.member_id === memberId);
    if (existing) {
      await supabase.from("ce_committee_meeting_attendance").update({ present: !existing.present }).eq("id", existing.id);
    } else {
      await supabase.from("ce_committee_meeting_attendance").insert({ meeting_id: id, member_id: memberId, present: true });
    }
    load();
  };

  const updateMeetingField = async (fields: Partial<Meeting>) => {
    setSaving(true);
    const supabase = createCEClient();
    await supabase.from("ce_committee_meetings").update(fields).eq("id", id);
    setMeeting((prev) => prev ? { ...prev, ...fields } : prev);
    setSaving(false);
  };

  const addMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createCEClient();
    await supabase.from("ce_committee_meeting_motions").insert({
      meeting_id: id,
      motion_text: motionForm.motion_text,
      motion_type: motionForm.motion_type,
      votes_for: parseInt(motionForm.votes_for) || 0,
      votes_against: parseInt(motionForm.votes_against) || 0,
      votes_abstain: parseInt(motionForm.votes_abstain) || 0,
      passed: motionForm.passed === "true" ? true : motionForm.passed === "false" ? false : null,
      notes: motionForm.notes || null,
    });
    setShowMotionForm(false);
    setMotionForm({ motion_text: "", motion_type: "other", votes_for: "", votes_against: "", votes_abstain: "", passed: "", notes: "" });
    load();
  };

  const addActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createCEClient();
    await supabase.from("ce_committee_action_items").insert({
      meeting_id: id,
      description: actionForm.description,
      assigned_to: actionForm.assigned_to || null,
      due_date: actionForm.due_date || null,
      notes: actionForm.notes || null,
      status: "pending",
    });
    setShowActionForm(false);
    setActionForm({ description: "", assigned_to: "", due_date: "", notes: "" });
    load();
  };

  const completeAction = async (actionId: string) => {
    const supabase = createCEClient();
    await supabase.from("ce_committee_action_items").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", actionId);
    load();
  };

  const markComplete = async () => {
    const presentCount = attendance.filter((a) => a.present).length;
    await updateMeetingField({ status: "completed", quorum_present: presentCount >= 3 });
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!meeting) return <div className="text-center py-16 text-muted-foreground">Meeting not found.</div>;

  const presentCount = attendance.filter((a) => a.present).length;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "attendance", label: "Attendance", count: presentCount },
    { key: "motions", label: "Motions", count: motions.length },
    { key: "actions", label: "Action Items", count: actionItems.filter((a) => a.status === "pending").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/ce/admin/committee/meetings" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">
              {new Date(meeting.meeting_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meeting.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {meeting.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{meeting.location} {meeting.start_time && `· ${meeting.start_time}`}</p>
        </div>
        {meeting.status === "scheduled" && (
          <Button onClick={markComplete} disabled={saving}>
            <Check className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-red-700 text-red-700" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 bg-muted text-foreground text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Quorum Present", checked: meeting.quorum_present, field: "quorum_present" as keyof Meeting },
              { label: "Previous Minutes Approved", checked: meeting.previous_minutes_approved, field: "previous_minutes_approved" as keyof Meeting },
              { label: "Minutes Approved", checked: meeting.minutes_approved, field: "minutes_approved" as keyof Meeting },
            ].map(({ label, checked, field }) => (
              <label key={field} className="flex items-center gap-3 bg-card border rounded-lg p-4 cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={(e) => updateMeetingField({ [field]: e.target.checked })}
                  className="accent-red-700 h-4 w-4"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>

          {[
            { label: "Old Business", field: "old_business" as keyof Meeting },
            { label: "New Business", field: "new_business" as keyof Meeting },
            { label: "Needs Assessment Notes", field: "needs_assessment_notes" as keyof Meeting },
          ].map(({ label, field }) => (
            <div key={field} className="bg-card border rounded-lg p-5">
              <label className="text-sm font-semibold mb-2 block">{label}</label>
              <textarea
                className="w-full text-sm border rounded-md px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={(meeting[field] as string) || ""}
                onChange={(e) => setMeeting((prev) => prev ? { ...prev, [field]: e.target.value } : prev)}
                onBlur={(e) => updateMeetingField({ [field]: e.target.value || null })}
                placeholder={`Enter ${label.toLowerCase()}...`}
              />
            </div>
          ))}

          <div className="bg-card border rounded-lg p-5">
            <label className="text-sm font-semibold mb-2 block">Next Meeting Date</label>
            <Input
              type="date"
              className="max-w-xs"
              value={meeting.next_meeting_date || ""}
              onChange={(e) => setMeeting((prev) => prev ? { ...prev, next_meeting_date: e.target.value } : prev)}
              onBlur={(e) => updateMeetingField({ next_meeting_date: e.target.value || null })}
            />
          </div>
        </div>
      )}

      {/* Attendance tab */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{presentCount} of {members.length} present {presentCount >= 3 ? "· Quorum met" : "· No quorum"}</p>
          </div>
          <div className="bg-card border rounded-lg divide-y">
            {members.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No active committee members. <Link href="/ce/admin/committee/members" className="text-red-700 hover:underline">Add members first.</Link>
              </div>
            ) : (
              members.map((member) => {
                const rec = attendance.find((a) => a.member_id === member.id);
                const present = rec?.present ?? false;
                return (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAttendance(member.id)} className="shrink-0">
                        {present
                          ? <CheckCircle className="h-5 w-5 text-green-500" />
                          : <Circle className="h-5 w-5 text-gray-300" />}
                      </button>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${present ? "text-green-700" : "text-muted-foreground"}`}>
                      {present ? "Present" : "Absent"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Motions tab */}
      {tab === "motions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowMotionForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" />Add Motion
            </Button>
          </div>

          {showMotionForm && (
            <div className="bg-card border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Add Motion</h3>
                <button onClick={() => setShowMotionForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <form onSubmit={addMotion} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Motion *</label>
                  <textarea required className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" value={motionForm.motion_text} onChange={(e) => setMotionForm((p) => ({ ...p, motion_text: e.target.value }))} placeholder="Motion to approve..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={motionForm.motion_type} onChange={(v) => setMotionForm((p) => ({ ...p, motion_type: v }))} options={[{ value: "other", label: "General" }, { value: "approve_minutes", label: "Approve Minutes" }, { value: "approve_course", label: "Approve Course" }]} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Result</label>
                    <Select value={motionForm.passed} onChange={(v) => setMotionForm((p) => ({ ...p, passed: v }))} options={[{ value: "", label: "Pending" }, { value: "true", label: "Passed" }, { value: "false", label: "Failed" }]} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Votes For</label>
                    <Input type="number" min="0" value={motionForm.votes_for} onChange={(e) => setMotionForm((p) => ({ ...p, votes_for: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Votes Against</label>
                    <Input type="number" min="0" value={motionForm.votes_against} onChange={(e) => setMotionForm((p) => ({ ...p, votes_against: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Add</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowMotionForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {motions.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">No motions recorded yet.</div>
          ) : (
            <div className="bg-card border rounded-lg divide-y">
              {motions.map((m) => (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm">{m.motion_text}</p>
                    {m.passed !== null && (
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${m.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {m.passed ? "Passed" : "Failed"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For: {m.votes_for} · Against: {m.votes_against} · Abstain: {m.votes_abstain}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action items tab */}
      {tab === "actions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowActionForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" />Add Action Item
            </Button>
          </div>

          {showActionForm && (
            <div className="bg-card border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Add Action Item</h3>
                <button onClick={() => setShowActionForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <form onSubmit={addActionItem} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description *</label>
                  <textarea required className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" value={actionForm.description} onChange={(e) => setActionForm((p) => ({ ...p, description: e.target.value }))} placeholder="Action item description..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Assigned To</label>
                    <Select value={actionForm.assigned_to} onChange={(v) => setActionForm((p) => ({ ...p, assigned_to: v }))}
                      options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Due Date</label>
                    <Input type="date" value={actionForm.due_date} onChange={(e) => setActionForm((p) => ({ ...p, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Add</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowActionForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {actionItems.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">No action items yet.</div>
          ) : (
            <div className="bg-card border rounded-lg divide-y">
              {actionItems.map((item) => {
                const overdue = item.due_date && item.status === "pending" && new Date(item.due_date) < new Date();
                return (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-start gap-3">
                      <button onClick={() => item.status === "pending" && completeAction(item.id)} className="mt-0.5 shrink-0">
                        {item.status === "completed"
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <Circle className="h-4 w-4 text-gray-300 hover:text-muted-foreground" />}
                      </button>
                      <div>
                        <p className={`text-sm ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.description}</p>
                        {item.due_date && (
                          <p className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            Due {new Date(item.due_date + "T00:00:00").toLocaleDateString()}{overdue ? " — Overdue" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input, Select } from "@/components/ui";
import { Users, Plus, X } from "lucide-react";

interface CommitteeMember {
  id: string;
  name: string;
  email: string;
  role: string;
  credentials: string | null;
  employer: string | null;
  term_start: string | null;
  term_end: string | null;
  status: string;
}

const ROLES = [
  { value: "chair", label: "Chair" },
  { value: "medical_director", label: "Medical Director" },
  { value: "secretary", label: "Secretary" },
  { value: "member", label: "Member" },
];

const ROLE_STYLES: Record<string, string> = {
  chair: "bg-red-100 text-red-700",
  medical_director: "bg-green-100 text-green-700",
  secretary: "bg-blue-100 text-blue-700",
  member: "bg-muted text-foreground",
};

export default function CECommitteeMembersPage() {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", role: "member", credentials: "", employer: "", term_start: "", term_end: "",
  });

  const load = async () => {
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_committee_members")
      .select("id, name, email, role, credentials, employer, term_start, term_end, status")
      .order("role").order("name");
    setMembers((data as CommitteeMember[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setSaveError("Name and email are required."); return; }
    setSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_committee_members").insert({
      name: form.name.trim(), email: form.email.trim(), role: form.role,
      credentials: form.credentials || null, employer: form.employer || null,
      term_start: form.term_start || null, term_end: form.term_end || null, status: "active",
    });
    if (error) { setSaveError("Failed to add member."); }
    else {
      setShowForm(false);
      setForm({ name: "", email: "", role: "member", credentials: "", employer: "", term_start: "", term_end: "" });
      load();
    }
    setSaving(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    const supabase = createCEClient();
    await supabase.from("ce_committee_members").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    load();
  };

  const active = members.filter((m) => m.status === "active");
  const inactive = members.filter((m) => m.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} active member{active.length !== 1 ? "s" : ""} — CAPCE requires at least 3
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4 mr-2" />Add Member</Button>
      </div>

      {active.length < 3 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <strong>CAPCE Requirement:</strong> A minimum of 3 active committee members is required for accreditation.
        </div>
      )}

      {showForm && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Committee Member</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          {saveError && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Smith" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <Select value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} options={ROLES} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Credentials</label>
                <Input value={form.credentials} onChange={(e) => setForm((p) => ({ ...p, credentials: e.target.value }))} placeholder="MD, NRP, FACEP" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Employer</label>
                <Input value={form.employer} onChange={(e) => setForm((p) => ({ ...p, employer: e.target.value }))} placeholder="Regional Medical Center" />
              </div>
              <div />
              <div className="space-y-1">
                <label className="text-sm font-medium">Term Start</label>
                <Input type="date" value={form.term_start} onChange={(e) => setForm((p) => ({ ...p, term_start: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Term End</label>
                <Input type="date" value={form.term_end} onChange={(e) => setForm((p) => ({ ...p, term_end: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Member"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold mb-3">Active Members</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Spinner size="lg" /></div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">No active members yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credentials</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Term</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {active.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[m.role] || "bg-muted text-foreground"}`}>
                        {ROLES.find((r) => r.value === m.role)?.label || m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.credentials || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.term_start && m.term_end
                        ? `${new Date(m.term_start + "T00:00:00").toLocaleDateString()} – ${new Date(m.term_end + "T00:00:00").toLocaleDateString()}`
                        : m.term_start ? `Since ${new Date(m.term_start + "T00:00:00").toLocaleDateString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleStatus(m.id, m.status)} className="text-xs text-muted-foreground hover:text-foreground">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {inactive.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground">Inactive Members</h2>
          <div className="bg-card border rounded-lg divide-y opacity-60">
            {inactive.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium line-through">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <button onClick={() => toggleStatus(m.id, m.status)} className="text-xs text-blue-600 hover:underline">Reactivate</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

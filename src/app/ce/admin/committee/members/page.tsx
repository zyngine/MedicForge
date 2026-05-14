"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input, Select } from "@/components/ui";
import { Users, Plus, X, Edit, Trash2, KeyRound, CheckCircle2, AlertCircle, Mail } from "lucide-react";

interface CommitteeMember {
  id: string;
  user_id: string | null;
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

interface FormState {
  name: string;
  email: string;
  role: string;
  credentials: string;
  employer: string;
  term_start: string;
  term_end: string;
}

const emptyForm: FormState = {
  name: "", email: "", role: "member", credentials: "", employer: "", term_start: "", term_end: "",
};

export default function CECommitteeMembersPage() {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_committee_members")
      .select("id, user_id, name, email, role, credentials, employer, term_start, term_end, status")
      .order("role").order("name");
    setMembers((data as CommitteeMember[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setSaveError("Name and email are required."); return; }
    setSaving(true);
    setSaveError(null);

    try {
      if (editingId) {
        const res = await fetch(`/api/ce/admin/committee/members/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            role: form.role,
            credentials: form.credentials || null,
            employer: form.employer || null,
            term_start: form.term_start || null,
            term_end: form.term_end || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setSaveError(data.error || "Failed to save changes.");
          return;
        }
        flash("Member updated.");
      } else {
        const res = await fetch("/api/ce/admin/committee/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            credentials: form.credentials || null,
            employer: form.employer || null,
            term_start: form.term_start || null,
            term_end: form.term_end || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.error || "Failed to add member.");
          return;
        }
        flash(data.invited ? "Member added — invitation email sent." : "Member added and linked to existing account.");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: CommitteeMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      email: m.email,
      role: m.role,
      credentials: m.credentials || "",
      employer: m.employer || "",
      term_start: m.term_start || "",
      term_end: m.term_end || "",
    });
    setShowForm(true);
    setSaveError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaveError(null);
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const res = await fetch(`/api/ce/admin/committee/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) await load();
  };

  const deleteMember = async (id: string) => {
    setActionError(null);
    const res = await fetch(`/api/ce/admin/committee/members/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || "Failed to delete.");
      return;
    }
    setConfirmDeleteId(null);
    flash("Member removed and admin access revoked.");
    await load();
  };

  const grantAccess = async (id: string) => {
    setActionError(null);
    const res = await fetch(`/api/ce/admin/committee/members/${id}/grant-access`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || "Failed to grant access.");
      return;
    }
    flash(data.invited ? "Invitation email sent." : "Access granted to existing account.");
    await load();
  };

  const resendSetup = async (id: string) => {
    setActionError(null);
    const res = await fetch(`/api/ce/admin/committee/members/${id}/resend-setup`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || "Failed to resend setup link.");
      return;
    }
    flash("Password setup email sent.");
  };

  const active = members.filter((m) => m.status === "active");
  const inactive = members.filter((m) => m.status !== "active");

  const deleteTarget = members.find((m) => m.id === confirmDeleteId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} active member{active.length !== 1 ? "s" : ""} — CAPCE requires at least 3
          </p>
        </div>
        <Button onClick={() => { if (showForm && editingId) closeForm(); setShowForm((v) => !v); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {actionNotice && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
          {actionNotice}
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {active.length < 3 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <strong>CAPCE Requirement:</strong> A minimum of 3 active committee members is required for accreditation.
        </div>
      )}

      {showForm && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? "Edit Committee Member" : "Add Committee Member"}</h2>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          {!editingId && (
            <p className="text-xs text-muted-foreground mb-4 bg-muted/30 rounded px-3 py-2 border">
              Adding a member emails an invitation and grants them full CE admin access once they set their password.
            </p>
          )}
          {saveError && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Smith" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com"
                  required
                  disabled={!!editingId}
                />
                {editingId && <p className="text-xs text-muted-foreground">Email is linked to a login and cannot be changed here.</p>}
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
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Add Member & Invite"}</Button>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Access</th>
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
                    <td className="px-4 py-3">
                      {m.user_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Linked
                        </span>
                      ) : (
                        <button
                          onClick={() => grantAccess(m.id)}
                          className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
                          title="Send an invitation and grant CE admin access"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          No access — grant
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.term_start && m.term_end
                        ? `${new Date(m.term_start + "T00:00:00").toLocaleDateString()} – ${new Date(m.term_end + "T00:00:00").toLocaleDateString()}`
                        : m.term_start ? `Since ${new Date(m.term_start + "T00:00:00").toLocaleDateString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!m.user_id ? (
                          <button
                            onClick={() => grantAccess(m.id)}
                            className="p-1.5 hover:bg-muted rounded text-amber-700"
                            title="Grant access"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => resendSetup(m.id)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Resend password setup email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(m.id, m.status)}
                          className="text-xs text-muted-foreground hover:text-foreground px-2"
                          title="Deactivate"
                        >
                          Deactivate
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="p-1.5 hover:bg-muted rounded text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
          <div className="bg-card border rounded-lg divide-y opacity-80">
            {inactive.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium line-through">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleStatus(m.id, m.status)} className="text-xs text-blue-600 hover:underline">Reactivate</button>
                  <button onClick={() => setConfirmDeleteId(m.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Remove {deleteTarget.name}?</h3>
            <p className="text-sm text-muted-foreground">
              This deletes the committee member record. {deleteTarget.user_id && <>Their CE account remains, but their <strong>admin access will be revoked</strong> (downgraded to a regular user).</>}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button onClick={() => deleteMember(deleteTarget.id)}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

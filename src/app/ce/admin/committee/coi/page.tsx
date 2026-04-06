"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { CheckCircle, AlertCircle, Upload } from "lucide-react";

interface COIRecord {
  id: string;
  member_id: string | null;
  instructor_id: string | null;
  entity_type: "member" | "instructor";
  entity_name: string;
  entity_role: string;
  signed_date: string | null;
  expires_at: string | null;
  attestation_signed: boolean;
  document_url: string | null;
  notes: string | null;
}

interface Member { id: string; name: string; role: string; }
interface Instructor { id: string; coi_expires_at: string | null; ce_users: { first_name: string; last_name: string } | null; }

export default function CECommitteeCOIPage() {
  const [records, setRecords] = useState<COIRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [form, setForm] = useState({
    entity_type: "member" as "member" | "instructor",
    member_id: "",
    instructor_id: "",
    signed_date: new Date().toISOString().split("T")[0],
    expires_at: "",
    attestation_signed: true,
    document_url: "",
    notes: "",
  });

  const load = async () => {
    setIsLoading(true);
    const supabase = createCEClient();
    const [coiRes, membersRes, instructorsRes] = await Promise.all([
      supabase.from("ce_conflict_of_interest").select("*").order("created_at", { ascending: false }),
      supabase.from("ce_committee_members").select("id, name, role").eq("status", "active"),
      supabase.from("ce_instructors").select("id, coi_expires_at, ce_users(first_name, last_name)"),
    ]);

    const memberMap: Record<string, Member> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (membersRes.data || []).forEach((m: any) => { memberMap[m.id] = m; });
    const instructorMap: Record<string, Instructor> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instructorsRes.data || []).forEach((i: any) => { instructorMap[i.id] = i; });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unified: COIRecord[] = (coiRes.data || []).map((r: any) => {
      if (r.member_id && memberMap[r.member_id]) {
        const m = memberMap[r.member_id];
        return { ...r, entity_type: "member" as const, entity_name: m.name, entity_role: m.role };
      }
      if (r.instructor_id && instructorMap[r.instructor_id]) {
        const i = instructorMap[r.instructor_id];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = i.ce_users as any;
        return { ...r, entity_type: "instructor" as const, entity_name: u ? `${u.first_name} ${u.last_name}` : "Unknown", entity_role: "Instructor" };
      }
      return { ...r, entity_type: "member" as const, entity_name: "Unknown", entity_role: "" };
    });

    setRecords(unified);
    setMembers(membersRes.data || []);
    setInstructors(instructorsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    const supabase = createCEClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      attestation_signed: form.attestation_signed,
      signed_date: form.signed_date || null,
      expires_at: form.expires_at || null,
      document_url: form.document_url || null,
      notes: form.notes || null,
    };
    if (form.entity_type === "member") payload.member_id = form.member_id;
    else payload.instructor_id = form.instructor_id;
    await supabase.from("ce_conflict_of_interest").insert(payload);
    setSaving(false);
    setShowForm(false);
    setForm({ entity_type: "member", member_id: "", instructor_id: "", signed_date: new Date().toISOString().split("T")[0], expires_at: "", attestation_signed: true, document_url: "", notes: "" });
    load();
  };

  const now = new Date();
  const expired = records.filter((r) => r.expires_at && new Date(r.expires_at) < now);
  const expiringSoon = records.filter((r) => {
    if (!r.expires_at || new Date(r.expires_at) < now) return false;
    return (new Date(r.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 90;
  });
  const signedCount = records.filter((r) => r.attestation_signed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conflict of Interest Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">{signedCount} signed attestation{signedCount !== 1 ? "s" : ""} on file</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add COI Record"}</Button>
      </div>

      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            <strong>{expired.length} COI form{expired.length !== 1 ? "s" : ""}</strong> have expired. Collect updated forms before the next audit.
          </p>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <strong>{expiringSoon.length} COI form{expiringSoon.length !== 1 ? "s" : ""}</strong> expiring within 90 days.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Add COI Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Entity Type</label>
              <select
                value={form.entity_type}
                onChange={(e) => setForm({ ...form, entity_type: e.target.value as "member" | "instructor", member_id: "", instructor_id: "" })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="member">Committee Member</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            {form.entity_type === "member" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">Committee Member</label>
                <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">Select member...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role.replace(/_/g, " ")})</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium">Instructor</label>
                <select value={form.instructor_id} onChange={(e) => setForm({ ...form, instructor_id: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">Select instructor...</option>
                  {instructors.map((i) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const u = i.ce_users as any;
                    return <option key={i.id} value={i.id}>{u ? `${u.first_name} ${u.last_name}` : i.id}</option>;
                  })}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Date Signed</label>
              <Input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Expiration Date</label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Document URL (optional)</label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="attest" checked={form.attestation_signed} onChange={(e) => setForm({ ...form, attestation_signed: e.target.checked })} className="rounded" />
            <label htmlFor="attest" className="text-sm">Attestation signed</label>
          </div>
          <Button onClick={submit} disabled={saving || (!form.member_id && !form.instructor_id)}>
            {saving ? "Saving..." : "Save Record"}
          </Button>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Upload className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No COI records on file</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Signed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isExpired = r.expires_at && new Date(r.expires_at) < now;
                const isSoon = r.expires_at && !isExpired && (new Date(r.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 90;
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.entity_name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{r.entity_role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.entity_type === "member" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {r.entity_type === "member" ? "Committee" : "Instructor"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.signed_date ? new Date(r.signed_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      {!r.attestation_signed ? (
                        <span className="text-xs text-red-600 font-medium">Not signed</span>
                      ) : isExpired ? (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />Expired</span>
                      ) : isSoon ? (
                        <span className="text-xs text-yellow-700 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />Expiring soon</span>
                      ) : (
                        <span className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />Current</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

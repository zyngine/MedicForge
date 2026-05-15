"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  Modal,
  ModalFooter,
  Select,
} from "@/components/ui";
import { ArrowLeft, CheckCircle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface Complaint {
  id: string;
  course_id: string | null;
  booking_id: string | null;
  filer_role: string;
  subject_type: string;
  subject_name: string | null;
  category: string;
  description: string;
  is_anonymous: boolean;
  status: "open" | "reviewed" | "resolved" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  filer: { id: string; full_name: string; email: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-red-100 text-red-700" },
  reviewed: { label: "Reviewed", className: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
  dismissed: { label: "Dismissed", className: "bg-gray-100 text-gray-700" },
};

const CATEGORY_LABELS: Record<string, string> = {
  behavior: "Behavior",
  safety: "Safety",
  attendance: "Attendance",
  communication: "Communication",
  other: "Other",
};

export default function ClinicalComplaintsPage() {
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"open" | "all" | "resolved">("open");
  const [selected, setSelected] = React.useState<Complaint | null>(null);
  const [updateStatus, setUpdateStatus] = React.useState<string>("reviewed");
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/clinical/complaints");
    if (res.ok) {
      const { complaints: data } = await res.json();
      setComplaints(data || []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/clinical/complaints/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: updateStatus,
        resolution_notes: resolutionNotes,
      }),
    });
    if (res.ok) {
      await load();
      setSelected(null);
    }
    setSaving(false);
  };

  const filtered = complaints.filter((c) => {
    if (tab === "open") return c.status === "open";
    if (tab === "resolved") return c.status === "resolved" || c.status === "dismissed";
    return true;
  });

  const counts = {
    open: complaints.filter((c) => c.status === "open").length,
    reviewed: complaints.filter((c) => c.status === "reviewed").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/instructor/clinical" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to clinical
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-7 w-7" />
          Clinical Complaints
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review concerns filed by students, preceptors, and instructors.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold text-red-600 mt-1">{counts.open}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">In review</p><p className="text-2xl font-bold text-yellow-600 mt-1">{counts.reviewed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Resolved (lifetime)</p><p className="text-2xl font-bold text-green-700 mt-1">{counts.resolved}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="open" value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="all">All ({complaints.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved / Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No complaints match this view.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const status = STATUS_LABELS[c.status];
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={status.className}>{status.label}</Badge>
                      <Badge variant="secondary">{CATEGORY_LABELS[c.category] || c.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        about {c.subject_type === "preceptor" ? `preceptor ${c.subject_name || ""}` : c.subject_type === "student" ? "a student" : c.subject_type === "site" ? `site ${c.subject_name || ""}` : "other"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelected(c);
                        setUpdateStatus(c.status === "open" ? "reviewed" : c.status);
                        setResolutionNotes(c.resolution_notes || "");
                      }}>
                        Review
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-foreground bg-muted/30 rounded p-3 line-clamp-3 whitespace-pre-wrap">
                    {c.description}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {c.is_anonymous ? (
                      <span className="italic">Filed anonymously</span>
                    ) : c.filer ? (
                      <span>Filed by <strong>{c.filer.full_name}</strong> ({c.filer_role})</span>
                    ) : (
                      <span>Filed by {c.filer_role}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title="Review complaint" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Filed</p>
              <p className="text-sm">{format(new Date(selected.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
              <p className="text-sm">{CATEGORY_LABELS[selected.category]} concern about {selected.subject_type === "preceptor" ? `preceptor ${selected.subject_name || ""}` : selected.subject_type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
              <div className="text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">{selected.description}</div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <Select
                  value={updateStatus}
                  onChange={(v) => setUpdateStatus(v)}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "reviewed", label: "Reviewed (acknowledged, action pending)" },
                    { value: "resolved", label: "Resolved (action taken)" },
                    { value: "dismissed", label: "Dismissed (no action)" },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Resolution notes</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="What action was taken? Visible to other instructors and admins."
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { FileText, ExternalLink } from "lucide-react";

interface Document {
  id: string;
  title: string;
  category: string;
  document_url: string;
  description: string | null;
  effective_date: string | null;
  review_date: string | null;
  version: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const CATEGORIES = [
  "Policies & Procedures",
  "Meeting Minutes",
  "Bylaws",
  "COI Forms",
  "Needs Assessment",
  "Course Materials",
  "Correspondence",
  "Other",
];

export default function CECommitteeDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [form, setForm] = useState({
    title: "",
    category: "",
    document_url: "",
    description: "",
    effective_date: "",
    review_date: "",
    version: "",
    uploaded_by: "",
  });

  const load = async () => {
    setIsLoading(true);
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_committee_documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title || !form.document_url || !form.category) return;
    setSaving(true);
    const supabase = createCEClient();
    await supabase.from("ce_committee_documents").insert({
      title: form.title,
      category: form.category,
      document_url: form.document_url,
      description: form.description || null,
      effective_date: form.effective_date || null,
      review_date: form.review_date || null,
      version: form.version || null,
      uploaded_by: form.uploaded_by || null,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: "", category: "", document_url: "", description: "", effective_date: "", review_date: "", version: "", uploaded_by: "" });
    load();
  };

  const categories = ["All", ...new Set(documents.map((d) => d.category))];
  const filtered = filterCategory === "All" ? documents : documents.filter((d) => d.category === filterCategory);

  /* eslint-disable react-hooks/purity -- Date.now() for display calculations */
  const needsReview = documents.filter((d) => {
    if (!d.review_date) return false;
    const diff = (new Date(d.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">{documents.length} document{documents.length !== 1 ? "s" : ""} on file</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Document"}</Button>
      </div>

      {needsReview.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <strong>{needsReview.length} document{needsReview.length !== 1 ? "s" : ""}</strong> due for review within 30 days.
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Add Document</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input placeholder="Document title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Version</label>
              <Input placeholder="e.g., 1.0, 2023-01" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Document URL</label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Effective Date</label>
              <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Review Date</label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Uploaded By</label>
              <Input placeholder="Name" value={form.uploaded_by} onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} disabled={saving || !form.title || !form.document_url || !form.category}>
            {saving ? "Saving..." : "Add Document"}
          </Button>
        </div>
      )}

      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCategory === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No documents found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Version</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Effective</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Review</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const overdue = d.review_date && new Date(d.review_date) < new Date();
                const dueSoon = d.review_date && !overdue && (new Date(d.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
                return (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{d.title}</p>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{d.category}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{d.version || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.effective_date ? new Date(d.effective_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {d.review_date ? (
                        <span className={overdue ? "text-red-600 font-medium" : dueSoon ? "text-yellow-700 font-medium" : "text-muted-foreground"}>
                          {new Date(d.review_date).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={d.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
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

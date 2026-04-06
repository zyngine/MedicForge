"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { ClipboardList } from "lucide-react";

interface NeedsAssessment {
  id: string;
  assessment_date: string;
  conducted_by: string | null;
  method: string | null;
  target_population: string | null;
  summary: string | null;
  identified_needs: string | null;
  recommended_topics: string | null;
  next_assessment_date: string | null;
  document_url: string | null;
}

const METHODS = ["Survey", "Focus Group", "Interview", "Observation", "Data Analysis", "Literature Review", "Other"];

export default function CECommitteeNeedsAssessmentPage() {
  const [assessments, setAssessments] = useState<NeedsAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    assessment_date: new Date().toISOString().split("T")[0],
    conducted_by: "",
    method: "",
    target_population: "",
    summary: "",
    identified_needs: "",
    recommended_topics: "",
    next_assessment_date: "",
    document_url: "",
  });

  const load = async () => {
    setIsLoading(true);
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_needs_assessments")
      .select("*")
      .order("assessment_date", { ascending: false });
    setAssessments(data || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    const supabase = createCEClient();
    await supabase.from("ce_needs_assessments").insert({
      assessment_date: form.assessment_date,
      conducted_by: form.conducted_by || null,
      method: form.method || null,
      target_population: form.target_population || null,
      summary: form.summary || null,
      identified_needs: form.identified_needs || null,
      recommended_topics: form.recommended_topics || null,
      next_assessment_date: form.next_assessment_date || null,
      document_url: form.document_url || null,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ assessment_date: new Date().toISOString().split("T")[0], conducted_by: "", method: "", target_population: "", summary: "", identified_needs: "", recommended_topics: "", next_assessment_date: "", document_url: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Needs Assessments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {assessments.length} assessment{assessments.length !== 1 ? "s" : ""} on record — required for CAPCE accreditation
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Assessment"}</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">CAPCE Requirement</p>
        <p className="text-xs">CAPCE requires documented needs assessments to demonstrate that CE offerings are driven by identified gaps in provider knowledge and skills. Conduct at least annually.</p>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Document Needs Assessment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Assessment Date</label>
              <Input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Conducted By</label>
              <Input placeholder="Name / committee" value={form.conducted_by} onChange={(e) => setForm({ ...form, conducted_by: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Method</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Select method...</option>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target Population</label>
              <Input placeholder="e.g., EMTs in rural regions" value={form.target_population} onChange={(e) => setForm({ ...form, target_population: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Summary</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Brief overview of the assessment process and findings..."
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Identified Needs</label>
              <textarea
                value={form.identified_needs}
                onChange={(e) => setForm({ ...form, identified_needs: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="List specific knowledge or skill gaps identified..."
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Recommended Topics</label>
              <textarea
                value={form.recommended_topics}
                onChange={(e) => setForm({ ...form, recommended_topics: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="CE topics recommended based on this assessment..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Next Assessment Date</label>
              <Input type="date" value={form.next_assessment_date} onChange={(e) => setForm({ ...form, next_assessment_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Document URL (optional)</label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} disabled={saving || !form.assessment_date}>
            {saving ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : assessments.length === 0 ? (
          <div className="bg-white border rounded-lg flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ClipboardList className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No needs assessments on record</p>
            <p className="text-xs mt-1">Add your first assessment to satisfy CAPCE requirements.</p>
          </div>
        ) : (
          assessments.map((a) => (
            <div key={a.id} className="bg-white border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-sm">{new Date(a.assessment_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.method && <span>{a.method}</span>}
                    {a.method && a.conducted_by && <span> · </span>}
                    {a.conducted_by && <span>Conducted by {a.conducted_by}</span>}
                    {!a.method && !a.conducted_by && <span>No details</span>}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{expanded === a.id ? "Collapse" : "View"}</span>
              </button>
              {expanded === a.id && (
                <div className="px-5 pb-5 border-t space-y-3 pt-4 text-sm">
                  {a.target_population && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Target Population</p>
                      <p>{a.target_population}</p>
                    </div>
                  )}
                  {a.summary && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
                      <p className="whitespace-pre-wrap">{a.summary}</p>
                    </div>
                  )}
                  {a.identified_needs && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Identified Needs</p>
                      <p className="whitespace-pre-wrap">{a.identified_needs}</p>
                    </div>
                  )}
                  {a.recommended_topics && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommended Topics</p>
                      <p className="whitespace-pre-wrap">{a.recommended_topics}</p>
                    </div>
                  )}
                  {a.next_assessment_date && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Next Assessment</p>
                      <p>{new Date(a.next_assessment_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {a.document_url && (
                    <a href={a.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline text-xs">View Document</a>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

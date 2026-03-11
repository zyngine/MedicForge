"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input, Button, Alert, Select, Spinner } from "@/components/ui";
import { ArrowLeft, Save, Plus, Trash2, Send, CheckCircle, Archive } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CECourse {
  id: string;
  course_number: string | null;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  ceh_hours: number;
  nremt_category: string;
  course_type: string;
  delivery_method: string;
  passing_score: number;
  expiration_months: number | null;
  target_audience: string | null;
  prerequisites: string | null;
  certification_levels: string[];
  language: string;
  is_free: boolean;
  price: number | null;
  status: string;
  disclosure_statement: string | null;
  has_commercial_support: boolean;
  commercial_supporter_name: string | null;
  commercial_support_disclosure: string | null;
  off_label_use_disclosure: string | null;
  evidence_basis: string | null;
  committee_notes: string | null;
  medical_director_notes: string | null;
}

interface Objective {
  id: string;
  objective_text: string;
  bloom_level: string | null;
  sort_order: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Reference {
  id: string;
  reference_type: string | null;
  citation: string;
  url: string | null;
  sort_order: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Airway", "Cardiology", "Trauma", "Medical", "Operations",
  "Pediatric", "OB/Gynecology", "Behavioral", "Hazmat", "EMS Operations",
];

const CERT_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic"];

const BLOOM_LEVELS = [
  { value: "", label: "Not specified" },
  { value: "knowledge", label: "Knowledge" },
  { value: "comprehension", label: "Comprehension" },
  { value: "application", label: "Application" },
  { value: "analysis", label: "Analysis" },
  { value: "synthesis", label: "Synthesis" },
  { value: "evaluation", label: "Evaluation" },
];

const REF_TYPES = [
  { value: "", label: "Not specified" },
  { value: "journal", label: "Journal Article" },
  { value: "textbook", label: "Textbook" },
  { value: "guideline", label: "Guideline / Protocol" },
  { value: "website", label: "Website" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_committee_review: "Pending Review",
  revisions_requested: "Revisions Needed",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_committee_review: "bg-yellow-100 text-yellow-800",
  revisions_requested: "bg-orange-100 text-orange-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-500",
};

type Tab = "details" | "objectives" | "references" | "capce" | "status";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CEAdminCourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<CECourse | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Details form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [cehHours, setCehHours] = useState("1.0");
  const [nremtCategory, setNremtCategory] = useState("National");
  const [courseType, setCourseType] = useState("standard");
  const [deliveryMethod, setDeliveryMethod] = useState("online_self_paced");
  const [passingScore, setPassingScore] = useState("70");
  const [expirationMonths, setExpirationMonths] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [certLevels, setCertLevels] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");

  // CAPCE form state
  const [disclosure, setDisclosure] = useState("");
  const [hasCommercialSupport, setHasCommercialSupport] = useState(false);
  const [commercialSupporterName, setCommercialSupporterName] = useState("");
  const [commercialSupportDisclosure, setCommercialSupportDisclosure] = useState("");
  const [offLabelDisclosure, setOffLabelDisclosure] = useState("");
  const [evidenceBasis, setEvidenceBasis] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const { data: c } = await supabase
        .from("ce_courses")
        .select("*")
        .eq("id", id)
        .single();

      if (!c) { router.push("/ce/admin/courses"); return; }

      setCourse(c);
      setTitle(c.title || "");
      setDescription(c.description || "");
      setCategory(c.category || "");
      setSubcategory(c.subcategory || "");
      setCehHours(String(c.ceh_hours || "1.0"));
      setNremtCategory(c.nremt_category || "National");
      setCourseType(c.course_type || "standard");
      setDeliveryMethod(c.delivery_method || "online_self_paced");
      setPassingScore(String(c.passing_score || "70"));
      setExpirationMonths(c.expiration_months ? String(c.expiration_months) : "");
      setTargetAudience(c.target_audience || "");
      setPrerequisites(c.prerequisites || "");
      setCertLevels(Array.isArray(c.certification_levels) ? c.certification_levels : []);
      setIsFree(c.is_free ?? true);
      setPrice(c.price ? String(c.price) : "");
      setDisclosure(c.disclosure_statement || "");
      setHasCommercialSupport(c.has_commercial_support || false);
      setCommercialSupporterName(c.commercial_supporter_name || "");
      setCommercialSupportDisclosure(c.commercial_support_disclosure || "");
      setOffLabelDisclosure(c.off_label_use_disclosure || "");
      setEvidenceBasis(c.evidence_basis || "");

      const { data: objs } = await supabase
        .from("ce_course_objectives")
        .select("*")
        .eq("course_id", id)
        .order("sort_order");
      setObjectives(objs || []);

      const { data: refs } = await supabase
        .from("ce_course_references")
        .select("*")
        .eq("course_id", id)
        .order("sort_order");
      setReferences(refs || []);

      setIsLoading(false);
    };
    load();
  }, [id, router]);

  const showSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ── Save details ──────────────────────────────────────────────────────────
  const saveDetails = async () => {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase
      .from("ce_courses")
      .update({
        title: title.trim(),
        description: description || null,
        category: category || null,
        subcategory: subcategory || null,
        ceh_hours: parseFloat(cehHours) || 1,
        nremt_category: nremtCategory,
        course_type: courseType,
        delivery_method: deliveryMethod,
        passing_score: parseInt(passingScore) || 70,
        expiration_months: expirationMonths ? parseInt(expirationMonths) : null,
        target_audience: targetAudience || null,
        prerequisites: prerequisites || null,
        certification_levels: certLevels,
        is_free: isFree,
        price: isFree ? null : (price ? parseFloat(price) : null),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { setSaveError("Failed to save."); } else { showSuccess(); }
    setIsSaving(false);
  };

  // ── Save objectives ───────────────────────────────────────────────────────
  const saveObjectives = async () => {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createCEClient();

    const toDelete = objectives.filter((o) => o.isDeleted && !o.isNew).map((o) => o.id);
    const toInsert = objectives.filter((o) => o.isNew && !o.isDeleted).map((o, i) => ({
      course_id: id,
      objective_text: o.objective_text,
      bloom_level: o.bloom_level || null,
      sort_order: i,
    }));
    const toUpdate = objectives.filter((o) => !o.isNew && !o.isDeleted).map((o, i) => ({
      id: o.id,
      objective_text: o.objective_text,
      bloom_level: o.bloom_level || null,
      sort_order: i,
    }));

    let err = null;
    if (toDelete.length) await supabase.from("ce_course_objectives").delete().in("id", toDelete);
    if (toInsert.length) { const r = await supabase.from("ce_course_objectives").insert(toInsert); err = r.error; }
    for (const obj of toUpdate) {
      const r = await supabase.from("ce_course_objectives").update({
        objective_text: obj.objective_text,
        bloom_level: obj.bloom_level,
        sort_order: obj.sort_order,
      }).eq("id", obj.id);
      if (r.error) err = r.error;
    }

    if (err) { setSaveError("Failed to save objectives."); } else {
      // Reload to get fresh IDs
      const { data: fresh } = await supabase
        .from("ce_course_objectives").select("*").eq("course_id", id).order("sort_order");
      setObjectives(fresh || []);
      showSuccess();
    }
    setIsSaving(false);
  };

  // ── Save references ───────────────────────────────────────────────────────
  const saveReferences = async () => {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createCEClient();

    const toDelete = references.filter((r) => r.isDeleted && !r.isNew).map((r) => r.id);
    const toInsert = references.filter((r) => r.isNew && !r.isDeleted).map((r, i) => ({
      course_id: id,
      reference_type: r.reference_type || null,
      citation: r.citation,
      url: r.url || null,
      sort_order: i,
    }));
    const toUpdate = references.filter((r) => !r.isNew && !r.isDeleted).map((r, i) => ({
      id: r.id,
      reference_type: r.reference_type || null,
      citation: r.citation,
      url: r.url || null,
      sort_order: i,
    }));

    let err = null;
    if (toDelete.length) await supabase.from("ce_course_references").delete().in("id", toDelete);
    if (toInsert.length) { const res = await supabase.from("ce_course_references").insert(toInsert); err = res.error; }
    for (const ref of toUpdate) {
      const res = await supabase.from("ce_course_references").update({
        reference_type: ref.reference_type,
        citation: ref.citation,
        url: ref.url,
        sort_order: ref.sort_order,
      }).eq("id", ref.id);
      if (res.error) err = res.error;
    }

    if (err) { setSaveError("Failed to save references."); } else {
      const { data: fresh } = await supabase
        .from("ce_course_references").select("*").eq("course_id", id).order("sort_order");
      setReferences(fresh || []);
      showSuccess();
    }
    setIsSaving(false);
  };

  // ── Save CAPCE ────────────────────────────────────────────────────────────
  const saveCAPCE = async () => {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase
      .from("ce_courses")
      .update({
        disclosure_statement: disclosure || null,
        has_commercial_support: hasCommercialSupport,
        commercial_supporter_name: hasCommercialSupport ? (commercialSupporterName || null) : null,
        commercial_support_disclosure: hasCommercialSupport ? (commercialSupportDisclosure || null) : null,
        off_label_use_disclosure: offLabelDisclosure || null,
        evidence_basis: evidenceBasis || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { setSaveError("Failed to save."); } else { showSuccess(); }
    setIsSaving(false);
  };

  // ── Status actions ────────────────────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const extra: Record<string, string> = {};
    if (newStatus === "pending_committee_review") extra.submitted_for_review_at = new Date().toISOString();
    if (newStatus === "published") extra.published_at = new Date().toISOString();
    if (newStatus === "archived") extra.archived_at = new Date().toISOString();
    const { error } = await supabase
      .from("ce_courses")
      .update({ status: newStatus, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id);
    if (error) { setSaveError("Failed to update status."); }
    else {
      setCourse((prev) => prev ? { ...prev, status: newStatus } : prev);
      showSuccess();
    }
    setIsSaving(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>;
  }

  if (!course) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "objectives", label: "Objectives" },
    { id: "references", label: "References" },
    { id: "capce", label: "CAPCE" },
    { id: "status", label: "Status" },
  ];

  const visibleObjectives = objectives.filter((o) => !o.isDeleted);
  const visibleReferences = references.filter((r) => !r.isDeleted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/ce/admin/courses" className="text-muted-foreground hover:text-foreground mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[course.status] || ""}`}>
                {STATUS_LABELS[course.status] || course.status}
              </span>
            </div>
            {course.course_number && (
              <p className="text-sm text-muted-foreground font-mono">{course.course_number}</p>
            )}
          </div>
        </div>
        <Link href={`/ce/admin/courses/${id}/review`}>
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Review Checklist
          </Button>
        </Link>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {saveSuccess && <Alert variant="success">Saved successfully.</Alert>}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-red-700 text-red-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Details tab ── */}
      {activeTab === "details" && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Title <span className="text-red-600">*</span></label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe what this course covers and its clinical relevance..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={category}
                    onChange={setCategory}
                    options={[{ value: "", label: "Select..." }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subcategory</label>
                  <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>CEH & Accreditation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CEH Hours <span className="text-red-600">*</span></label>
                  <Input type="number" min="0.25" step="0.25" value={cehHours} onChange={(e) => setCehHours(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">NREMT Category</label>
                  <Select
                    value={nremtCategory}
                    onChange={setNremtCategory}
                    options={[
                      { value: "National", label: "National" },
                      { value: "Local", label: "Local" },
                      { value: "Individual", label: "Individual" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passing Score (%)</label>
                  <Input type="number" min="50" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course Type</label>
                  <Select
                    value={courseType}
                    onChange={setCourseType}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "refresher", label: "Refresher" },
                      { value: "protocol_update", label: "Protocol Update" },
                      { value: "skills", label: "Skills-Based" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Method</label>
                  <Select
                    value={deliveryMethod}
                    onChange={setDeliveryMethod}
                    options={[
                      { value: "online_self_paced", label: "Online — Self-Paced" },
                      { value: "online_live", label: "Online — Live" },
                      { value: "blended", label: "Blended" },
                      { value: "in_person", label: "In Person" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expires After (months)</label>
                  <Input type="number" min="1" value={expirationMonths} onChange={(e) => setExpirationMonths(e.target.value)} placeholder="None" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Audience & Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Certification Levels</label>
                <div className="flex gap-4 flex-wrap">
                  {CERT_LEVELS.map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={certLevels.includes(level)}
                        onChange={(e) =>
                          setCertLevels(e.target.checked
                            ? [...certLevels, level]
                            : certLevels.filter((l) => l !== level)
                          )
                        }
                        className="accent-red-700"
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., EMT and Paramedic providers with 2+ years experience" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prerequisites</label>
                <Input value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} placeholder="e.g., Basic Life Support certification" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pricing</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={isFree} onChange={() => setIsFree(true)} className="accent-red-700" />
                    <span className="text-sm">Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!isFree} onChange={() => setIsFree(false)} className="accent-red-700" />
                    <span className="text-sm">Paid</span>
                  </label>
                  {!isFree && (
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="pl-7" placeholder="9.99" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveDetails} disabled={isSaving}>
              {isSaving ? <span className="flex items-center gap-2"><Spinner size="sm" />Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" />Save Details</span>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Objectives tab ── */}
      {activeTab === "objectives" && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                List the specific knowledge or skills learners will gain. CAPCE requires measurable objectives with Bloom&apos;s taxonomy levels.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setObjectives((prev) => [
                  ...prev,
                  { id: `new-${Date.now()}`, objective_text: "", bloom_level: "", sort_order: prev.length, isNew: true },
                ])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add Objective
            </Button>
          </div>

          {visibleObjectives.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground text-sm">
              No objectives yet. Add at least 3 measurable learning objectives.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleObjectives.map((obj, idx) => (
                <div key={obj.id} className="bg-white rounded-lg border p-4 flex gap-3 items-start">
                  <span className="text-muted-foreground text-sm font-mono mt-2 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={obj.objective_text}
                      onChange={(e) =>
                        setObjectives((prev) =>
                          prev.map((o) => o.id === obj.id ? { ...o, objective_text: e.target.value } : o)
                        )
                      }
                      placeholder="e.g., Identify the three components of the cardiac conduction system"
                    />
                    <Select
                      value={obj.bloom_level || ""}
                      onChange={(v) =>
                        setObjectives((prev) =>
                          prev.map((o) => o.id === obj.id ? { ...o, bloom_level: v } : o)
                        )
                      }
                      options={BLOOM_LEVELS}
                    />
                  </div>
                  <button
                    onClick={() =>
                      setObjectives((prev) =>
                        obj.isNew
                          ? prev.filter((o) => o.id !== obj.id)
                          : prev.map((o) => o.id === obj.id ? { ...o, isDeleted: true } : o)
                      )
                    }
                    className="text-muted-foreground hover:text-red-600 mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={saveObjectives} disabled={isSaving}>
              {isSaving ? <span className="flex items-center gap-2"><Spinner size="sm" />Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" />Save Objectives</span>}
            </Button>
          </div>
        </div>
      )}

      {/* ── References tab ── */}
      {activeTab === "references" && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Cite the evidence base for this course. CAPCE requires documented references for all clinical content.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setReferences((prev) => [
                  ...prev,
                  { id: `new-${Date.now()}`, reference_type: "", citation: "", url: "", sort_order: prev.length, isNew: true },
                ])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add Reference
            </Button>
          </div>

          {visibleReferences.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground text-sm">
              No references yet. Add clinical guidelines, journal articles, or textbooks.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleReferences.map((ref, idx) => (
                <div key={ref.id} className="bg-white rounded-lg border p-4 flex gap-3 items-start">
                  <span className="text-muted-foreground text-sm font-mono mt-2 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Select
                      value={ref.reference_type || ""}
                      onChange={(v) =>
                        setReferences((prev) =>
                          prev.map((r) => r.id === ref.id ? { ...r, reference_type: v } : r)
                        )
                      }
                      options={REF_TYPES}
                    />
                    <Input
                      value={ref.citation}
                      onChange={(e) =>
                        setReferences((prev) =>
                          prev.map((r) => r.id === ref.id ? { ...r, citation: e.target.value } : r)
                        )
                      }
                      placeholder="Full citation (APA or AMA format)"
                    />
                    <Input
                      value={ref.url || ""}
                      onChange={(e) =>
                        setReferences((prev) =>
                          prev.map((r) => r.id === ref.id ? { ...r, url: e.target.value } : r)
                        )
                      }
                      placeholder="URL (optional)"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setReferences((prev) =>
                        ref.isNew
                          ? prev.filter((r) => r.id !== ref.id)
                          : prev.map((r) => r.id === ref.id ? { ...r, isDeleted: true } : r)
                      )
                    }
                    className="text-muted-foreground hover:text-red-600 mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={saveReferences} disabled={isSaving}>
              {isSaving ? <span className="flex items-center gap-2"><Spinner size="sm" />Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" />Save References</span>}
            </Button>
          </div>
        </div>
      )}

      {/* ── CAPCE tab ── */}
      {activeTab === "capce" && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader><CardTitle>Disclosure Statement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                CAPCE requires all course developers and instructors to disclose any potential conflicts of interest.
                This statement will be displayed to learners before the course begins.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Disclosure Statement <span className="text-red-600">*</span></label>
                <textarea
                  value={disclosure}
                  onChange={(e) => setDisclosure(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., The content developers and planners for this activity have no relevant financial relationships to disclose."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Commercial Support</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCommercialSupport}
                  onChange={(e) => setHasCommercialSupport(e.target.checked)}
                  className="accent-red-700 h-4 w-4"
                />
                <span className="text-sm font-medium">This course received commercial support</span>
              </label>
              {hasCommercialSupport && (
                <div className="space-y-3 pl-7">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supporter Name</label>
                    <Input value={commercialSupporterName} onChange={(e) => setCommercialSupporterName(e.target.value)} placeholder="Company or organization name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Disclosure</label>
                    <textarea
                      value={commercialSupportDisclosure}
                      onChange={(e) => setCommercialSupportDisclosure(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Describe the nature of commercial support received..."
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Clinical Content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Off-Label Use Disclosure</label>
                <textarea
                  value={offLabelDisclosure}
                  onChange={(e) => setOffLabelDisclosure(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="If this course discusses off-label use of medications or devices, describe here. Otherwise leave blank."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence Basis</label>
                <textarea
                  value={evidenceBasis}
                  onChange={(e) => setEvidenceBasis(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe the level of evidence supporting this course content (e.g., Level I RCT evidence, AHA guidelines, NAEMSP consensus statement)..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveCAPCE} disabled={isSaving}>
              {isSaving ? <span className="flex items-center gap-2"><Spinner size="sm" />Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" />Save CAPCE Info</span>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Status tab ── */}
      {activeTab === "status" && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Course Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Current status:</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[course.status] || ""}`}>
                  {STATUS_LABELS[course.status] || course.status}
                </span>
              </div>

              {course.committee_notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Committee Notes</p>
                  <p className="text-yellow-700">{course.committee_notes}</p>
                </div>
              )}

              {course.medical_director_notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  <p className="font-medium text-blue-800 mb-1">Medical Director Notes</p>
                  <p className="text-blue-700">{course.medical_director_notes}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Workflow Actions</p>

                {course.status === "draft" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <Send className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Submit for Committee Review</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Course will be locked for editing until reviewed.</p>
                    </div>
                    <Button size="sm" onClick={() => updateStatus("pending_committee_review")} disabled={isSaving}>
                      Submit
                    </Button>
                  </div>
                )}

                {course.status === "revisions_requested" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <Send className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Resubmit After Revisions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Mark revisions complete and resubmit for review.</p>
                    </div>
                    <Button size="sm" onClick={() => updateStatus("pending_committee_review")} disabled={isSaving}>
                      Resubmit
                    </Button>
                  </div>
                )}

                {course.status === "approved" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Publish Course</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Make this course available to enrolled learners.</p>
                    </div>
                    <Button size="sm" onClick={() => updateStatus("published")} disabled={isSaving}>
                      Publish
                    </Button>
                  </div>
                )}

                {course.status === "published" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <Archive className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Archive Course</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Remove from catalog. Existing completions are preserved.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("archived")} disabled={isSaving}>
                      Archive
                    </Button>
                  </div>
                )}

                {(course.status === "pending_committee_review") && (
                  <p className="text-sm text-muted-foreground italic">
                    This course is pending committee review. Status will be updated by an admin after review.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

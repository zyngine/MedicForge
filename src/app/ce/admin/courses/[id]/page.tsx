"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input, Button, Alert, Select, Spinner } from "@/components/ui";
import { ArrowLeft, Save, Plus, Trash2, Send, CheckCircle, Archive, ChevronDown, ChevronRight, GripVertical } from "lucide-react";

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

interface Module {
  id: string;
  module_number: number;
  title: string;
  duration_minutes: number;
  sort_order: number;
  isNew?: boolean;
  expanded?: boolean;
  content: ContentBlock[];
}

interface ContentBlock {
  id: string;
  content_type: string;
  content_order: number;
  title: string | null;
  body: string | null;
  video_url: string | null;
  pdf_url: string | null;
  image_url: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  quiz_type: string;
  passing_score: number;
  randomize_questions: boolean;
  max_attempts: number;
  show_answers_after: string;
}

interface Question {
  id: string;
  question_type: string;
  question_text: string;
  explanation: string | null;
  correct_answer: string;
  difficulty: string;
  sort_order: number;
  options: QuestionOption[];
  isNew?: boolean;
  isDeleted?: boolean;
  expanded?: boolean;
}

interface QuestionOption {
  id: string;
  option_text: string;
  option_order: number;
  isNew?: boolean;
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

const CONTENT_TYPES = [
  { value: "text", label: "Text / HTML" },
  { value: "video", label: "Video (URL)" },
  { value: "pdf", label: "PDF (URL)" },
  { value: "image", label: "Image (URL)" },
];

type Tab = "details" | "objectives" | "references" | "modules" | "quiz" | "capce" | "status";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CEAdminCourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<CECourse | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
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

  // Quiz form state
  const [quizTitle, setQuizTitle] = useState("");
  const [quizType, setQuizType] = useState("post_test");
  const [quizPassingScore, setQuizPassingScore] = useState("70");
  const [quizMaxAttempts, setQuizMaxAttempts] = useState("3");
  const [quizRandomize, setQuizRandomize] = useState(true);
  const [quizShowAnswers, setQuizShowAnswers] = useState("after_passing");

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

      const [objRes, refRes, modRes, quizRes] = await Promise.all([
        supabase.from("ce_course_objectives").select("*").eq("course_id", id).order("sort_order"),
        supabase.from("ce_course_references").select("*").eq("course_id", id).order("sort_order"),
        supabase.from("ce_course_modules").select("*, ce_module_content(*)").eq("course_id", id).order("sort_order"),
        supabase.from("ce_quizzes").select("*").eq("course_id", id).limit(1).single(),
      ]);

      setObjectives(objRes.data || []);
      setReferences(refRes.data || []);

      const rawMods = modRes.data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setModules(rawMods.map((m: any) => ({
        ...m,
        expanded: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: (m.ce_module_content || []).sort((a: any, b: any) => a.content_order - b.content_order),
      })));

      if (quizRes.data) {
        const q = quizRes.data;
        setQuiz(q);
        setQuizTitle(q.title);
        setQuizType(q.quiz_type);
        setQuizPassingScore(String(q.passing_score));
        setQuizMaxAttempts(String(q.max_attempts));
        setQuizRandomize(q.randomize_questions);
        setQuizShowAnswers(q.show_answers_after);

        const { data: qqs } = await supabase
          .from("ce_quiz_questions")
          .select("*, ce_quiz_question_options(*)")
          .eq("quiz_id", q.id)
          .order("sort_order");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQuestions((qqs || []).map((qq: any) => ({
          ...qq,
          expanded: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options: (qq.ce_quiz_question_options || []).sort((a: any, b: any) => a.option_order - b.option_order),
        })));
      } else {
        setQuizTitle(c.title + " — Post-Test");
      }

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
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_courses").update({
      title: title.trim(), description: description || null, category: category || null,
      subcategory: subcategory || null, ceh_hours: parseFloat(cehHours) || 1,
      nremt_category: nremtCategory, course_type: courseType, delivery_method: deliveryMethod,
      passing_score: parseInt(passingScore) || 70,
      expiration_months: expirationMonths ? parseInt(expirationMonths) : null,
      target_audience: targetAudience || null, prerequisites: prerequisites || null,
      certification_levels: certLevels, is_free: isFree,
      price: isFree ? null : (price ? parseFloat(price) : null),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { setSaveError("Failed to save."); } else { showSuccess(); }
    setIsSaving(false);
  };

  // ── Save objectives ───────────────────────────────────────────────────────
  const saveObjectives = async () => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    const toDelete = objectives.filter((o) => o.isDeleted && !o.isNew).map((o) => o.id);
    const toInsert = objectives.filter((o) => o.isNew && !o.isDeleted).map((o, i) => ({
      course_id: id, objective_text: o.objective_text, bloom_level: o.bloom_level || null, sort_order: i,
    }));
    const toUpdate = objectives.filter((o) => !o.isNew && !o.isDeleted).map((o, i) => ({
      id: o.id, objective_text: o.objective_text, bloom_level: o.bloom_level || null, sort_order: i,
    }));
    let err = null;
    if (toDelete.length) await supabase.from("ce_course_objectives").delete().in("id", toDelete);
    if (toInsert.length) { const r = await supabase.from("ce_course_objectives").insert(toInsert); err = r.error; }
    for (const obj of toUpdate) {
      const r = await supabase.from("ce_course_objectives").update({ objective_text: obj.objective_text, bloom_level: obj.bloom_level, sort_order: obj.sort_order }).eq("id", obj.id);
      if (r.error) err = r.error;
    }
    if (err) { setSaveError("Failed to save objectives."); } else {
      const { data: fresh } = await supabase.from("ce_course_objectives").select("*").eq("course_id", id).order("sort_order");
      setObjectives(fresh || []);
      showSuccess();
    }
    setIsSaving(false);
  };

  // ── Save references ───────────────────────────────────────────────────────
  const saveReferences = async () => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    const toDelete = references.filter((r) => r.isDeleted && !r.isNew).map((r) => r.id);
    const toInsert = references.filter((r) => r.isNew && !r.isDeleted).map((r, i) => ({
      course_id: id, reference_type: r.reference_type || null, citation: r.citation, url: r.url || null, sort_order: i,
    }));
    const toUpdate = references.filter((r) => !r.isNew && !r.isDeleted).map((r, i) => ({
      id: r.id, reference_type: r.reference_type || null, citation: r.citation, url: r.url || null, sort_order: i,
    }));
    let err = null;
    if (toDelete.length) await supabase.from("ce_course_references").delete().in("id", toDelete);
    if (toInsert.length) { const res = await supabase.from("ce_course_references").insert(toInsert); err = res.error; }
    for (const ref of toUpdate) {
      const res = await supabase.from("ce_course_references").update({ reference_type: ref.reference_type, citation: ref.citation, url: ref.url, sort_order: ref.sort_order }).eq("id", ref.id);
      if (res.error) err = res.error;
    }
    if (err) { setSaveError("Failed to save references."); } else {
      const { data: fresh } = await supabase.from("ce_course_references").select("*").eq("course_id", id).order("sort_order");
      setReferences(fresh || []);
      showSuccess();
    }
    setIsSaving(false);
  };

  // ── Save CAPCE ────────────────────────────────────────────────────────────
  const saveCAPCE = async () => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_courses").update({
      disclosure_statement: disclosure || null, has_commercial_support: hasCommercialSupport,
      commercial_supporter_name: hasCommercialSupport ? (commercialSupporterName || null) : null,
      commercial_support_disclosure: hasCommercialSupport ? (commercialSupportDisclosure || null) : null,
      off_label_use_disclosure: offLabelDisclosure || null, evidence_basis: evidenceBasis || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { setSaveError("Failed to save."); } else { showSuccess(); }
    setIsSaving(false);
  };

  // ── Status actions ────────────────────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    const extra: Record<string, string> = {};
    if (newStatus === "pending_committee_review") extra.submitted_for_review_at = new Date().toISOString();
    if (newStatus === "published") extra.published_at = new Date().toISOString();
    if (newStatus === "archived") extra.archived_at = new Date().toISOString();
    const { error } = await supabase.from("ce_courses").update({ status: newStatus, updated_at: new Date().toISOString(), ...extra }).eq("id", id);
    if (error) { setSaveError("Failed to update status."); }
    else { setCourse((prev) => prev ? { ...prev, status: newStatus } : prev); showSuccess(); }
    setIsSaving(false);
  };

  // ── Module ops ────────────────────────────────────────────────────────────
  const addModule = () => {
    const nextNum = modules.length + 1;
    setModules((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`, module_number: nextNum, title: `Module ${nextNum}`,
        duration_minutes: 0, sort_order: prev.length, isNew: true, expanded: true, content: [],
      },
    ]);
  };

  const saveModule = async (mod: Module) => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    if (mod.isNew) {
      const { data, error } = await supabase.from("ce_course_modules").insert({
        course_id: id, module_number: mod.module_number, title: mod.title,
        duration_minutes: mod.duration_minutes, sort_order: mod.sort_order,
      }).select("*").single();
      if (error) { setSaveError("Failed to save module."); }
      else {
        setModules((prev) => prev.map((m) => m.id === mod.id ? { ...data, isNew: false, expanded: true, content: mod.content } : m));
        showSuccess();
      }
    } else {
      const { error } = await supabase.from("ce_course_modules").update({
        title: mod.title, duration_minutes: mod.duration_minutes,
      }).eq("id", mod.id);
      if (error) { setSaveError("Failed to save module."); } else { showSuccess(); }
    }
    setIsSaving(false);
  };

  const deleteModule = async (modId: string, isNew?: boolean) => {
    if (!isNew) {
      const supabase = createCEClient();
      await supabase.from("ce_course_modules").delete().eq("id", modId);
    }
    setModules((prev) => prev.filter((m) => m.id !== modId));
  };

  const addContent = (modId: string) => {
    setModules((prev) => prev.map((m) => m.id === modId ? {
      ...m,
      content: [...m.content, {
        id: `new-${Date.now()}`, content_type: "text", content_order: m.content.length,
        title: "", body: "", video_url: null, pdf_url: null, image_url: null, isNew: true,
      }],
    } : m));
  };

  const saveContent = async (modId: string, block: ContentBlock) => {
    if (block.isDeleted) return;
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    if (block.isNew) {
      const { data, error } = await supabase.from("ce_module_content").insert({
        module_id: modId, content_type: block.content_type, content_order: block.content_order,
        title: block.title || null, body: block.body || null,
        video_url: block.video_url || null, pdf_url: block.pdf_url || null, image_url: block.image_url || null,
      }).select("*").single();
      if (error) { setSaveError("Failed to save content."); }
      else {
        setModules((prev) => prev.map((m) => m.id === modId ? {
          ...m, content: m.content.map((c) => c.id === block.id ? { ...data, isNew: false } : c),
        } : m));
        showSuccess();
      }
    } else {
      const { error } = await supabase.from("ce_module_content").update({
        content_type: block.content_type, title: block.title || null, body: block.body || null,
        video_url: block.video_url || null, pdf_url: block.pdf_url || null, image_url: block.image_url || null,
      }).eq("id", block.id);
      if (error) { setSaveError("Failed to save content."); } else { showSuccess(); }
    }
    setIsSaving(false);
  };

  const deleteContent = async (modId: string, blockId: string, isNew?: boolean) => {
    if (!isNew) {
      const supabase = createCEClient();
      await supabase.from("ce_module_content").delete().eq("id", blockId);
    }
    setModules((prev) => prev.map((m) => m.id === modId ? {
      ...m, content: m.content.filter((c) => c.id !== blockId),
    } : m));
  };

  // ── Quiz ops ──────────────────────────────────────────────────────────────
  const saveQuizSettings = async () => {
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    if (quiz) {
      const { error } = await supabase.from("ce_quizzes").update({
        title: quizTitle, quiz_type: quizType, passing_score: parseInt(quizPassingScore) || 70,
        max_attempts: parseInt(quizMaxAttempts) || 3, randomize_questions: quizRandomize,
        show_answers_after: quizShowAnswers,
      }).eq("id", quiz.id);
      if (error) { setSaveError("Failed to save quiz."); } else { showSuccess(); }
    } else {
      const { data, error } = await supabase.from("ce_quizzes").insert({
        course_id: id, title: quizTitle, quiz_type: quizType,
        passing_score: parseInt(quizPassingScore) || 70,
        max_attempts: parseInt(quizMaxAttempts) || 3, randomize_questions: quizRandomize,
        show_answers_after: quizShowAnswers,
      }).select("*").single();
      if (error) { setSaveError("Failed to create quiz."); }
      else { setQuiz(data); showSuccess(); }
    }
    setIsSaving(false);
  };

  const addQuestion = () => {
    if (!quiz) return;
    const sortOrder = questions.filter((q) => !q.isDeleted).length;
    setQuestions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`, question_type: "multiple_choice", question_text: "",
        explanation: "", correct_answer: "", difficulty: "medium", sort_order: sortOrder,
        options: [
          { id: `opt-a-${Date.now()}`, option_text: "", option_order: 0, isNew: true },
          { id: `opt-b-${Date.now()}`, option_text: "", option_order: 1, isNew: true },
          { id: `opt-c-${Date.now()}`, option_text: "", option_order: 2, isNew: true },
          { id: `opt-d-${Date.now()}`, option_text: "", option_order: 3, isNew: true },
        ],
        isNew: true, expanded: true,
      },
    ]);
  };

  const saveQuestion = async (q: Question) => {
    if (!quiz) return;
    setIsSaving(true); setSaveError(null);
    const supabase = createCEClient();
    if (q.isNew) {
      const { data: qData, error: qErr } = await supabase.from("ce_quiz_questions").insert({
        quiz_id: quiz.id, question_type: q.question_type, question_text: q.question_text,
        explanation: q.explanation || null, correct_answer: q.correct_answer,
        difficulty: q.difficulty, sort_order: q.sort_order,
      }).select("*").single();
      if (qErr) { setSaveError("Failed to save question."); setIsSaving(false); return; }
      const opts = q.options.map((o, i) => ({
        question_id: qData.id, option_text: o.option_text, option_order: i,
      }));
      if (opts.length) await supabase.from("ce_quiz_question_options").insert(opts);
      const { data: freshOpts } = await supabase.from("ce_quiz_question_options").select("*").eq("question_id", qData.id).order("option_order");
      setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qData, isNew: false, expanded: false, options: freshOpts || [] } : qq));
      showSuccess();
    } else {
      const { error } = await supabase.from("ce_quiz_questions").update({
        question_type: q.question_type, question_text: q.question_text,
        explanation: q.explanation || null, correct_answer: q.correct_answer, difficulty: q.difficulty,
      }).eq("id", q.id);
      // Update options: delete all, re-insert
      await supabase.from("ce_quiz_question_options").delete().eq("question_id", q.id);
      const opts = q.options.filter((o) => o.option_text.trim()).map((o, i) => ({
        question_id: q.id, option_text: o.option_text, option_order: i,
      }));
      if (opts.length) await supabase.from("ce_quiz_question_options").insert(opts);
      if (error) { setSaveError("Failed to save question."); }
      else {
        setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, expanded: false } : qq));
        showSuccess();
      }
    }
    setIsSaving(false);
  };

  const deleteQuestion = async (qId: string, isNew?: boolean) => {
    if (!isNew) {
      const supabase = createCEClient();
      await supabase.from("ce_quiz_questions").delete().eq("id", qId);
    }
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
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
    { id: "modules", label: "Modules" },
    { id: "quiz", label: "Quiz" },
    { id: "capce", label: "CAPCE" },
    { id: "status", label: "Status" },
  ];

  const visibleObjectives = objectives.filter((o) => !o.isDeleted);
  const visibleReferences = references.filter((r) => !r.isDeleted);
  const visibleQuestions = questions.filter((q) => !q.isDeleted);

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
      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                  <Select value={category} onChange={setCategory} options={[{ value: "", label: "Select..." }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
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
                  <Select value={nremtCategory} onChange={setNremtCategory} options={[
                    { value: "National", label: "National" },
                    { value: "Local", label: "Local" },
                    { value: "Individual", label: "Individual" },
                  ]} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passing Score (%)</label>
                  <Input type="number" min="50" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course Type</label>
                  <Select value={courseType} onChange={setCourseType} options={[
                    { value: "standard", label: "Standard" },
                    { value: "refresher", label: "Refresher" },
                    { value: "protocol_update", label: "Protocol Update" },
                    { value: "skills", label: "Skills-Based" },
                  ]} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Method</label>
                  <Select value={deliveryMethod} onChange={setDeliveryMethod} options={[
                    { value: "online_self_paced", label: "Online — Self-Paced" },
                    { value: "online_live", label: "Online — Live" },
                    { value: "blended", label: "Blended" },
                    { value: "in_person", label: "In Person" },
                  ]} />
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
                        onChange={(e) => setCertLevels(e.target.checked ? [...certLevels, level] : certLevels.filter((l) => l !== level))}
                        className="accent-red-700"
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., EMT and Paramedic providers" />
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
            <p className="text-sm text-muted-foreground">CAPCE requires measurable objectives with Bloom&apos;s taxonomy levels.</p>
            <Button size="sm" variant="outline" onClick={() => setObjectives((prev) => [...prev, { id: `new-${Date.now()}`, objective_text: "", bloom_level: "", sort_order: prev.length, isNew: true }])}>
              <Plus className="h-4 w-4 mr-1" /> Add Objective
            </Button>
          </div>
          {visibleObjectives.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground text-sm">No objectives yet. Add at least 3 measurable learning objectives.</div>
          ) : (
            <div className="space-y-3">
              {visibleObjectives.map((obj, idx) => (
                <div key={obj.id} className="bg-white rounded-lg border p-4 flex gap-3 items-start">
                  <span className="text-muted-foreground text-sm font-mono mt-2 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input value={obj.objective_text} onChange={(e) => setObjectives((prev) => prev.map((o) => o.id === obj.id ? { ...o, objective_text: e.target.value } : o))} placeholder="e.g., Identify the three components of the cardiac conduction system" />
                    <Select value={obj.bloom_level || ""} onChange={(v) => setObjectives((prev) => prev.map((o) => o.id === obj.id ? { ...o, bloom_level: v } : o))} options={BLOOM_LEVELS} />
                  </div>
                  <button onClick={() => setObjectives((prev) => obj.isNew ? prev.filter((o) => o.id !== obj.id) : prev.map((o) => o.id === obj.id ? { ...o, isDeleted: true } : o))} className="text-muted-foreground hover:text-red-600 mt-2"><Trash2 className="h-4 w-4" /></button>
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
            <p className="text-sm text-muted-foreground">CAPCE requires documented references for all clinical content.</p>
            <Button size="sm" variant="outline" onClick={() => setReferences((prev) => [...prev, { id: `new-${Date.now()}`, reference_type: "", citation: "", url: "", sort_order: prev.length, isNew: true }])}>
              <Plus className="h-4 w-4 mr-1" /> Add Reference
            </Button>
          </div>
          {visibleReferences.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground text-sm">No references yet. Add clinical guidelines, journal articles, or textbooks.</div>
          ) : (
            <div className="space-y-3">
              {visibleReferences.map((ref, idx) => (
                <div key={ref.id} className="bg-white rounded-lg border p-4 flex gap-3 items-start">
                  <span className="text-muted-foreground text-sm font-mono mt-2 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Select value={ref.reference_type || ""} onChange={(v) => setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, reference_type: v } : r))} options={REF_TYPES} />
                    <Input value={ref.citation} onChange={(e) => setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, citation: e.target.value } : r))} placeholder="Full citation (APA or AMA format)" />
                    <Input value={ref.url || ""} onChange={(e) => setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, url: e.target.value } : r))} placeholder="URL (optional)" />
                  </div>
                  <button onClick={() => setReferences((prev) => ref.isNew ? prev.filter((r) => r.id !== ref.id) : prev.map((r) => r.id === ref.id ? { ...r, isDeleted: true } : r))} className="text-muted-foreground hover:text-red-600 mt-2"><Trash2 className="h-4 w-4" /></button>
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

      {/* ── Modules tab ── */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Build the content learners will work through. Add text, videos, PDFs, or images.</p>
            </div>
            <Button size="sm" onClick={addModule} disabled={isSaving}>
              <Plus className="h-4 w-4 mr-1" /> Add Module
            </Button>
          </div>

          {modules.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground">
              <p className="font-medium mb-1">No modules yet</p>
              <p className="text-sm mb-4">Add your first module to start building course content.</p>
              <Button size="sm" onClick={addModule}>Add Module</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, modIdx) => (
                <div key={mod.id} className="bg-white border rounded-lg overflow-hidden">
                  {/* Module header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">{modIdx + 1}</span>
                    <Input
                      value={mod.title}
                      onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, title: e.target.value } : m))}
                      className="flex-1 border-0 bg-transparent p-0 text-sm font-medium focus:ring-0"
                      placeholder="Module title"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        value={mod.duration_minutes}
                        onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, duration_minutes: parseInt(e.target.value) || 0 } : m))}
                        className="w-16 text-xs"
                        title="Duration (minutes)"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                      <Button size="sm" variant="outline" onClick={() => saveModule(mod)} disabled={isSaving}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, expanded: !m.expanded } : m))}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {mod.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteModule(mod.id, mod.isNew)} className="text-muted-foreground hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Module content blocks */}
                  {mod.expanded && (
                    <div className="p-4 space-y-3">
                      {mod.content.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No content yet. Add a text block, video, or PDF.</p>
                      )}
                      {mod.content.filter((c) => !c.isDeleted).map((block, blockIdx) => (
                        <div key={block.id} className="border rounded-md p-3 space-y-2 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{blockIdx + 1}</span>
                            <Select
                              value={block.content_type}
                              onChange={(v) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, content_type: v } : c),
                              } : m))}
                              options={CONTENT_TYPES}
                            />
                            <Input
                              value={block.title || ""}
                              onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, title: e.target.value } : c),
                              } : m))}
                              placeholder="Block title (optional)"
                              className="flex-1"
                            />
                            <Button size="sm" variant="outline" onClick={() => saveContent(mod.id, block)} disabled={isSaving}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <button onClick={() => deleteContent(mod.id, block.id, block.isNew)} className="text-muted-foreground hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {block.content_type === "text" && (
                            <textarea
                              value={block.body || ""}
                              onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, body: e.target.value } : c),
                              } : m))}
                              rows={6}
                              className="w-full px-3 py-2 text-sm border rounded-md bg-white resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                              placeholder="Enter text content (HTML supported)..."
                            />
                          )}
                          {block.content_type === "video" && (
                            <Input
                              value={block.video_url || ""}
                              onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, video_url: e.target.value } : c),
                              } : m))}
                              placeholder="Video URL (YouTube embed, Vimeo, or direct .mp4)"
                            />
                          )}
                          {block.content_type === "pdf" && (
                            <Input
                              value={block.pdf_url || ""}
                              onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, pdf_url: e.target.value } : c),
                              } : m))}
                              placeholder="PDF URL"
                            />
                          )}
                          {block.content_type === "image" && (
                            <Input
                              value={block.image_url || ""}
                              onChange={(e) => setModules((prev) => prev.map((m) => m.id === mod.id ? {
                                ...m, content: m.content.map((c) => c.id === block.id ? { ...c, image_url: e.target.value } : c),
                              } : m))}
                              placeholder="Image URL"
                            />
                          )}
                        </div>
                      ))}
                      {!mod.isNew && (
                        <Button size="sm" variant="outline" onClick={() => addContent(mod.id)} className="w-full">
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Content Block
                        </Button>
                      )}
                      {mod.isNew && (
                        <p className="text-xs text-muted-foreground text-center">Save the module first, then add content.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quiz tab ── */}
      {activeTab === "quiz" && (
        <div className="space-y-6">
          {/* Quiz settings */}
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>{quiz ? "Quiz Settings" : "Create Quiz"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quiz Title</label>
                <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quiz Type</label>
                  <Select value={quizType} onChange={setQuizType} options={[
                    { value: "post_test", label: "Post-Test" },
                    { value: "pre_test", label: "Pre-Test" },
                    { value: "final_exam", label: "Final Exam" },
                    { value: "module_quiz", label: "Module Quiz" },
                  ]} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passing Score (%)</label>
                  <Input type="number" min="50" max="100" value={quizPassingScore} onChange={(e) => setQuizPassingScore(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Attempts</label>
                  <Input type="number" min="1" value={quizMaxAttempts} onChange={(e) => setQuizMaxAttempts(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Show Answers After</label>
                  <Select value={quizShowAnswers} onChange={setQuizShowAnswers} options={[
                    { value: "after_passing", label: "After Passing" },
                    { value: "after_attempt", label: "After Each Attempt" },
                    { value: "never", label: "Never" },
                  ]} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={quizRandomize} onChange={(e) => setQuizRandomize(e.target.checked)} className="accent-red-700" />
                <span className="text-sm">Randomize question order</span>
              </label>
              <div className="flex justify-end">
                <Button onClick={saveQuizSettings} disabled={isSaving}>
                  {isSaving ? <span className="flex items-center gap-2"><Spinner size="sm" />Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" />{quiz ? "Save Settings" : "Create Quiz"}</span>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {quiz && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{visibleQuestions.length} Question{visibleQuestions.length !== 1 ? "s" : ""}</h2>
                <Button size="sm" onClick={addQuestion} disabled={isSaving}>
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>

              {visibleQuestions.length === 0 ? (
                <div className="bg-white border rounded-lg p-8 text-center text-muted-foreground text-sm">
                  No questions yet. Add your first question.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleQuestions.map((q, qIdx) => (
                    <div key={q.id} className="bg-white border rounded-lg overflow-hidden">
                      {/* Question header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                        <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">{qIdx + 1}.</span>
                        <p className="flex-1 text-sm font-medium truncate">
                          {q.question_text || <span className="text-muted-foreground italic">New question</span>}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${q.difficulty === "easy" ? "bg-green-100 text-green-700" : q.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {q.difficulty}
                          </span>
                          <button onClick={() => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, expanded: !qq.expanded } : qq))} className="text-muted-foreground hover:text-foreground p-1">
                            {q.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <button onClick={() => deleteQuestion(q.id, q.isNew)} className="text-muted-foreground hover:text-red-600 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question editor */}
                      {q.expanded && (
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Question Type</label>
                              <Select
                                value={q.question_type}
                                onChange={(v) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? {
                                  ...qq,
                                  question_type: v,
                                  options: v === "true_false"
                                    ? [{ id: `tf-t-${Date.now()}`, option_text: "True", option_order: 0, isNew: true }, { id: `tf-f-${Date.now()}`, option_text: "False", option_order: 1, isNew: true }]
                                    : qq.options.length === 2 && (qq.options[0].option_text === "True")
                                      ? [
                                          { id: `opt-a-${Date.now()}`, option_text: "", option_order: 0, isNew: true },
                                          { id: `opt-b-${Date.now()}`, option_text: "", option_order: 1, isNew: true },
                                          { id: `opt-c-${Date.now()}`, option_text: "", option_order: 2, isNew: true },
                                          { id: `opt-d-${Date.now()}`, option_text: "", option_order: 3, isNew: true },
                                        ]
                                      : qq.options,
                                } : qq))}
                                options={[
                                  { value: "multiple_choice", label: "Multiple Choice" },
                                  { value: "true_false", label: "True / False" },
                                ]}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Difficulty</label>
                              <Select
                                value={q.difficulty}
                                onChange={(v) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, difficulty: v } : qq))}
                                options={[
                                  { value: "easy", label: "Easy" },
                                  { value: "medium", label: "Medium" },
                                  { value: "hard", label: "Hard" },
                                ]}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium">Question Text <span className="text-red-600">*</span></label>
                            <textarea
                              value={q.question_text}
                              onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, question_text: e.target.value } : qq))}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                              placeholder="Enter the question..."
                            />
                          </div>

                          {/* Answer options */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium">Answer Options — select the correct answer</label>
                            {q.options.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correct_answer === opt.option_text && opt.option_text !== ""}
                                  onChange={() => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, correct_answer: opt.option_text } : qq))}
                                  className="accent-red-700 shrink-0"
                                  title="Mark as correct"
                                />
                                <span className="text-xs text-muted-foreground font-mono w-4">{String.fromCharCode(65 + optIdx)}.</span>
                                {q.question_type === "true_false" ? (
                                  <span className="text-sm flex-1 px-3 py-1.5 border rounded-md bg-gray-50">{opt.option_text}</span>
                                ) : (
                                  <Input
                                    value={opt.option_text}
                                    onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? {
                                      ...qq,
                                      options: qq.options.map((o) => o.id === opt.id ? { ...o, option_text: e.target.value } : o),
                                      correct_answer: qq.correct_answer === opt.option_text ? e.target.value : qq.correct_answer,
                                    } : qq))}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    className="flex-1"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium">Explanation (shown after answering)</label>
                            <Input
                              value={q.explanation || ""}
                              onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, explanation: e.target.value } : qq))}
                              placeholder="Explain why the correct answer is correct..."
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button size="sm" onClick={() => saveQuestion(q)} disabled={isSaving}>
                              {isSaving ? <Spinner size="sm" /> : <><Save className="h-3.5 w-3.5 mr-1" />Save Question</>}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CAPCE tab ── */}
      {activeTab === "capce" && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader><CardTitle>Disclosure Statement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">CAPCE requires all course developers and instructors to disclose any potential conflicts of interest. This statement will be displayed to learners before the course begins.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Disclosure Statement <span className="text-red-600">*</span></label>
                <textarea value={disclosure} onChange={(e) => setDisclosure(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g., The content developers and planners for this activity have no relevant financial relationships to disclose." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Commercial Support</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={hasCommercialSupport} onChange={(e) => setHasCommercialSupport(e.target.checked)} className="accent-red-700 h-4 w-4" />
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
                    <textarea value={commercialSupportDisclosure} onChange={(e) => setCommercialSupportDisclosure(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Describe the nature of commercial support received..." />
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
                <textarea value={offLabelDisclosure} onChange={(e) => setOffLabelDisclosure(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="If this course discusses off-label use, describe here. Otherwise leave blank." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence Basis</label>
                <textarea value={evidenceBasis} onChange={(e) => setEvidenceBasis(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Describe the level of evidence supporting this course content..." />
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
            <CardHeader><CardTitle>Course Status</CardTitle></CardHeader>
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
                    <Button size="sm" onClick={() => updateStatus("pending_committee_review")} disabled={isSaving}>Submit</Button>
                  </div>
                )}

                {course.status === "revisions_requested" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <Send className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Resubmit After Revisions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Mark revisions complete and resubmit for review.</p>
                    </div>
                    <Button size="sm" onClick={() => updateStatus("pending_committee_review")} disabled={isSaving}>Resubmit</Button>
                  </div>
                )}

                {course.status === "approved" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Publish Course</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Make this course available to enrolled learners.</p>
                    </div>
                    <Button size="sm" onClick={() => updateStatus("published")} disabled={isSaving}>Publish</Button>
                  </div>
                )}

                {course.status === "published" && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <Archive className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Archive Course</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Remove from catalog. Existing completions are preserved.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("archived")} disabled={isSaving}>Archive</Button>
                  </div>
                )}

                {course.status === "pending_committee_review" && (
                  <p className="text-sm text-muted-foreground italic">This course is pending committee review.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

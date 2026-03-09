"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Spinner,
  Alert,
  Modal,
  FilterSelect,
} from "@/components/ui";
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  BarChart3,
  BookOpen,
  Trash2,
  Eye,
  Edit,
  Database,
  FolderOpen,
  ArrowLeft,
  GraduationCap,
  Plus,
  Upload,
} from "lucide-react";
import { QuestionEditor } from "@/components/question-bank/question-editor";
import { QuestionImporter } from "@/components/question-bank/question-importer";
import type { CreateQuestionInput } from "@/lib/hooks/use-question-bank";

interface QuestionBankItem {
  id: string;
  question_text: string;
  question_type: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }> | null;
  correct_answer: unknown;
  explanation: string | null;
  certification_level: string;
  difficulty: string;
  tags: string[] | null;
  points: number;
  time_estimate_seconds: number;
  times_used: number;
  times_correct: number;
  avg_time_seconds: number | null;
  is_validated: boolean;
  tenant_id: string | null;
  created_at: string;
}

interface LevelCounts {
  EMR: number;
  EMT: number;
  AEMT: number;
  Paramedic: number;
}

interface QuestionFilters {
  search?: string;
  category?: string;
  difficulty?: string;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-orange-100 text-orange-800",
  expert: "bg-red-100 text-red-800",
};

const levelConfig: Record<string, { color: string; bgColor: string; description: string }> = {
  EMR: { color: "text-slate-700", bgColor: "bg-slate-100 hover:bg-slate-200", description: "Emergency Medical Responder" },
  EMT: { color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200", description: "Emergency Medical Technician" },
  AEMT: { color: "text-purple-700", bgColor: "bg-purple-100 hover:bg-purple-200", description: "Advanced EMT" },
  Paramedic: { color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200", description: "Paramedic" },
};

export default function PlatformQuestionBankPage() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [levelCounts, setLevelCounts] = useState<LevelCounts>({ EMR: 0, EMT: 0, AEMT: 0, Paramedic: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  useEffect(() => { fetchLevelCounts(); }, []);
  useEffect(() => { if (selectedLevel) { fetchQuestions(); fetchCategories(); } }, [selectedLevel, filters]);

  const fetchLevelCounts = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      const levels = ["EMR", "EMT", "AEMT", "Paramedic"];
      const counts: LevelCounts = { EMR: 0, EMT: 0, AEMT: 0, Paramedic: 0 };
      await Promise.all(levels.map(async (level) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any).from("question_bank").select("*", { count: "exact", head: true }).eq("certification_level", level);
        counts[level as keyof LevelCounts] = count || 0;
      }));
      setLevelCounts(counts);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to fetch counts"); }
    finally { setIsLoading(false); }
  };

  const fetchCategories = async () => {
    if (!selectedLevel) return;
    const supabase = createClient();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("question_bank").select("tags").eq("certification_level", selectedLevel).not("tags", "is", null);
      const allTags = new Set<string>();
      data?.forEach((q: { tags: string[] | null }) => { q.tags?.forEach((tag) => allTags.add(tag)); });
      setCategories(Array.from(allTags).sort());
    } catch (err) { console.error("Failed to fetch categories:", err); }
  };

  const fetchQuestions = async () => {
    if (!selectedLevel) return;
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from("question_bank").select("*", { count: "exact" }).eq("certification_level", selectedLevel).order("created_at", { ascending: false }).limit(100);
      if (filters.search) query = query.ilike("question_text", `%${filters.search}%`);
      if (filters.category) query = query.contains("tags", [filters.category]);
      if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;
      setQuestions(data || []);
      setTotal(count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to fetch questions"); }
    finally { setIsLoading(false); }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setFilters((prev) => ({ ...prev, search: e.target.value })); };
  const handleFilterChange = (key: keyof QuestionFilters, value: string | undefined) => { setFilters((prev) => ({ ...prev, [key]: value || undefined })); };
  const handleBack = () => { setSelectedLevel(null); setFilters({}); setQuestions([]); fetchLevelCounts(); };

  const handleMakeGlobal = async (question: QuestionBankItem) => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("question_bank").update({ tenant_id: null }).eq("id", question.id);
    if (!error) fetchQuestions();
  };

  const handleValidate = async (question: QuestionBankItem) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("question_bank").update({
        is_validated: true,
        reviewed_at: new Date().toISOString(),
      }).eq("id", question.id);
      if (error) throw error;
      toast.success("Question validated");
      fetchQuestions();
    } catch (err) {
      console.error("Validate error:", err);
      toast.error("Failed to validate question");
    }
  };

  const handleDelete = async (question: QuestionBankItem) => {
    if (!confirm(`Delete question?\n${question.question_text.substring(0, 50)}...`)) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("question_bank").delete().eq("id", question.id);
    if (!error) fetchQuestions();
  };

  const handleMakeAllGlobal = async () => {
    if (!confirm("Make all questions global (visible to all tenants)?")) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("question_bank").update({ tenant_id: null }).not("tenant_id", "is", null);
    if (!error) fetchLevelCounts();
  };

  const handleValidateAll = async () => {
    if (!confirm("Validate all pending questions?")) return;
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("question_bank").update({
        is_validated: true,
        reviewed_at: new Date().toISOString(),
      }).eq("is_validated", false);
      if (error) throw error;
      toast.success("All questions validated");
      fetchLevelCounts();
    } catch (err) {
      console.error("Validate all error:", err);
      toast.error("Failed to validate questions");
    }
  };

  const handleCreateQuestion = async (data: any) => {
    try {
      const supabase = createClient();
      // Only include valid columns for the question_bank table
      const insertData = {
        question_text: data.question_text,
        question_type: data.question_type,
        options: data.options,
        correct_answer: data.correct_answer,
        explanation: data.explanation || null,
        certification_level: data.certification_level || selectedLevel || "EMT",
        difficulty: data.difficulty || "medium",
        points: data.points || 1,
        time_estimate_seconds: data.time_estimate_seconds || 60,
        source: data.source || null,
        tags: data.tags || null,
        tenant_id: null, // Global question
        is_validated: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("question_bank").insert(insertData);
      if (error) throw error;
      toast.success("Question created");
      setShowEditor(false);
      setEditingQuestion(null);
      if (selectedLevel) fetchQuestions();
      else fetchLevelCounts();
    } catch (err) {
      console.error("Create question error:", err);
      toast.error("Failed to create question");
    }
  };

  const handleUpdateQuestion = async (data: any) => {
    if (!editingQuestion) return;
    try {
      const supabase = createClient();
      // Only include valid columns for the question_bank table
      const updateData = {
        question_text: data.question_text,
        question_type: data.question_type,
        options: data.options,
        correct_answer: data.correct_answer,
        explanation: data.explanation || null,
        certification_level: data.certification_level,
        difficulty: data.difficulty,
        points: data.points,
        time_estimate_seconds: data.time_estimate_seconds,
        source: data.source || null,
        tags: data.tags || null,
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("question_bank").update(updateData).eq("id", editingQuestion.id);
      if (error) throw error;
      toast.success("Question updated");
      setShowEditor(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err) {
      console.error("Update question error:", err);
      toast.error("Failed to update question");
    }
  };


  const handleGlobalImport = async (questions: CreateQuestionInput[]): Promise<number> => {
    try {
      const res = await fetch("/api/platform-admin/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: questions.map((q) => ({
            ...q,
            certification_level: q.certification_level ?? selectedLevel ?? "EMT",
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      const count: number = json.count ?? 0;
      toast.success(count + " questions imported");
      if (selectedLevel) fetchQuestions();
      else fetchLevelCounts();
      return count;
    } catch (err) {
      console.error("Global import error:", err);
      toast.error("Failed to import questions");
      return 0;
    }
  };
  const totalQuestions = Object.values(levelCounts).reduce((a, b) => a + b, 0);

  // FOLDER VIEW
  if (!selectedLevel) {
    if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Global Question Bank</h1>
            <p className="text-muted-foreground">{totalQuestions.toLocaleString()} questions organized by certification level</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMakeAllGlobal}><Database className="h-4 w-4 mr-2" />Make All Global</Button>
            <Button variant="outline" onClick={handleValidateAll}><CheckCircle className="h-4 w-4 mr-2" />Validate All</Button>
          </div>
        </div>
        {error && <Alert variant="error" title="Error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-6">
          {(["EMR", "EMT", "AEMT", "Paramedic"] as const).map((level) => {
            const config = levelConfig[level];
            const count = levelCounts[level];
            return (
              <Card key={level} className={`cursor-pointer transition-all hover:shadow-lg ${config.bgColor}`} onClick={() => setSelectedLevel(level)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-white/50"><FolderOpen className={`h-10 w-10 ${config.color}`} /></div>
                    <div className="flex-1">
                      <h3 className={`text-2xl font-bold ${config.color}`}>{level}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      <div className="mt-2"><Badge variant="secondary" className="text-lg px-3 py-1">{count.toLocaleString()} questions</Badge></div>
                    </div>
                    <GraduationCap className={`h-8 w-8 opacity-50 ${config.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Question Distribution</h3>
            <div className="space-y-3">
              {(["EMR", "EMT", "AEMT", "Paramedic"] as const).map((level) => {
                const count = levelCounts[level];
                const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
                const config = levelConfig[level];
                return (
                  <div key={level} className="flex items-center gap-4">
                    <span className="w-24 font-medium">{level}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${config.bgColor.split(" ")[0]}`} style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="w-20 text-right text-sm text-muted-foreground">{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // QUESTIONS VIEW
  const levelConf = levelConfig[selectedLevel];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{selectedLevel} Questions</h1>
              <Badge className={`${levelConf.bgColor.split(" ")[0]} ${levelConf.color}`}>{levelConf.description}</Badge>
            </div>
            <p className="text-muted-foreground">{total.toLocaleString()} questions in this level</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImporter(true)}>
            <Upload className="h-4 w-4 mr-2" />Import CSV
          </Button>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Question
          </Button>
        </div>
      </div>
      {error && <Alert variant="error" title="Error">{error}</Alert>}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search questions..." className="pl-10" value={filters.search || ""} onChange={handleSearch} />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />Filters
              {Object.keys(filters).filter((k) => k !== "search" && filters[k as keyof QuestionFilters]).length > 0 && <Badge className="ml-2" variant="secondary">{Object.keys(filters).filter((k) => k !== "search" && filters[k as keyof QuestionFilters]).length}</Badge>}
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <FilterSelect value={filters.category || ""} onChange={(value) => handleFilterChange("category", value)} placeholder="All Categories" options={[{ value: "", label: "All Categories" }, ...categories.map((cat) => ({ value: cat, label: cat }))]} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <FilterSelect value={filters.difficulty || ""} onChange={(value) => handleFilterChange("difficulty", value)} placeholder="All Difficulties" options={[{ value: "", label: "All Difficulties" }, { value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }, { value: "expert", label: "Expert" }]} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {isLoading ? <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div> : questions.length === 0 ? (
        <Card><CardContent className="py-12"><div className="text-center"><BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Questions Found</h3><p className="text-muted-foreground">{Object.keys(filters).length > 0 ? "Try adjusting your filters" : "No questions in this level yet"}</p></div></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={difficultyColors[question.difficulty] || "bg-gray-100"}>{question.difficulty}</Badge>
                      {question.tags?.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                      {question.is_validated ? <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Validated</Badge> : <Badge variant="secondary">Pending</Badge>}
                      {question.tenant_id === null && <Badge variant="outline" className="border-blue-500 text-blue-600"><Database className="h-3 w-3 mr-1" />Global</Badge>}
                    </div>
                    <p className="font-medium line-clamp-2">{question.question_text}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{question.times_used} uses</span>
                      {question.times_used > 0 && <span>{Math.round((question.times_correct / question.times_used) * 100)}% correct</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{question.time_estimate_seconds}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedQuestion(question)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingQuestion(question); setShowEditor(true); }} title="Edit question"><Edit className="h-4 w-4" /></Button>
                    {question.tenant_id !== null && <Button variant="ghost" size="sm" onClick={() => handleMakeGlobal(question)} title="Make global"><Database className="h-4 w-4 text-blue-600" /></Button>}
                    {!question.is_validated && <Button variant="ghost" size="sm" onClick={() => handleValidate(question)} title="Validate"><CheckCircle className="h-4 w-4 text-green-600" /></Button>}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(question)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal isOpen={!!selectedQuestion} onClose={() => setSelectedQuestion(null)} title="Question Preview" size="lg">
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className={difficultyColors[selectedQuestion.difficulty] || "bg-gray-100"}>{selectedQuestion.difficulty}</Badge>
              {selectedQuestion.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
            <div className="bg-muted p-4 rounded-lg"><p className="font-medium text-lg">{selectedQuestion.question_text}</p></div>
            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Options:</p>
                {selectedQuestion.options.map((opt, i) => (
                  <div key={opt.id} className={`p-3 rounded-lg border ${opt.isCorrect ? "border-green-500 bg-green-50" : ""}`}>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt.text}
                    {opt.isCorrect && <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />}
                  </div>
                ))}
              </div>
            )}
            {selectedQuestion.explanation && <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p><p className="text-blue-700">{selectedQuestion.explanation}</p></div>}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t text-sm">
              <div><p className="text-muted-foreground">Times Used</p><p className="font-medium">{selectedQuestion.times_used}</p></div>
              <div><p className="text-muted-foreground">Success Rate</p><p className="font-medium">{selectedQuestion.times_used > 0 ? `${Math.round((selectedQuestion.times_correct / selectedQuestion.times_used) * 100)}%` : "N/A"}</p></div>
              <div><p className="text-muted-foreground">Avg. Time</p><p className="font-medium">{selectedQuestion.avg_time_seconds ? `${Math.round(selectedQuestion.avg_time_seconds)}s` : "N/A"}</p></div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setSelectedQuestion(null); setEditingQuestion(selectedQuestion); setShowEditor(true); }}>
                <Edit className="h-4 w-4 mr-2" />Edit Question
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        title="Import Questions from CSV"
        size="xl"
      >
        <QuestionImporter
          categories={[]}
          importFn={handleGlobalImport}
          onImport={async () => { setShowImporter(false); }}
          onCancel={() => setShowImporter(false)}
        />
      </Modal>

      {/* Question Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => { setShowEditor(false); setEditingQuestion(null); }}
        title={editingQuestion ? "Edit Question" : "Add Question"}
        size="xl"
      >
        <QuestionEditor
          question={editingQuestion ? {
            ...editingQuestion,
            category_id: undefined,
            category: undefined,
            source: undefined,
          } as any : null}
          categories={[]}
          onSave={async (data) => {
            if (editingQuestion) {
              await handleUpdateQuestion(data);
            } else {
              await handleCreateQuestion(data);
            }
          }}
          onCancel={() => { setShowEditor(false); setEditingQuestion(null); }}
        />
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Alert } from "@/components/ui";
import {
  CheckCircle, ChevronLeft, ChevronRight, BookOpen, Award, XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string;
  module_number: number;
  title: string;
  duration_minutes: number;
  sort_order: number;
  content: ContentBlock[];
  completed: boolean;
  started: boolean;
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
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  explanation: string | null;
  correct_answer: string;
  options: { id: string; option_text: string; option_order: number }[];
}

interface Enrollment {
  id: string;
  completion_status: string;
  progress_percentage: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isYoutubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function toEmbedUrl(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CECourseLearnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [ceUserId, setCeUserId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Quiz state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizView, setQuizView] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; attempts: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/ce/login?redirect=/ce/course/${id}/learn`); return; }

      const { data: ceUser } = await supabase.from("ce_users").select("id").eq("id", user.id).single();
      if (!ceUser) { router.push("/ce/catalog"); return; }
      setCeUserId(ceUser.id);

      const { data: enrollment } = await supabase
        .from("ce_enrollments")
        .select("id, completion_status, progress_percentage")
        .eq("user_id", ceUser.id)
        .eq("course_id", id)
        .single();

      if (!enrollment) { router.push(`/ce/course/${id}`); return; }
      setEnrollment(enrollment);

      const { data: course } = await supabase.from("ce_courses").select("title, passing_score").eq("id", id).single();
      setCourseTitle(course?.title || "");

      const [modsRes, progressRes, quizRes] = await Promise.all([
        supabase.from("ce_course_modules").select("*, ce_module_content(*)").eq("course_id", id).order("sort_order"),
        supabase.from("ce_module_progress").select("module_id, completed_at, started_at").eq("enrollment_id", enrollment.id),
        supabase.from("ce_quizzes").select("id, passing_score").eq("course_id", id).limit(1).single(),
      ]);

      const progressMap = new Map<string, { completed_at: string | null; started_at: string | null }>(
        (progressRes.data || []).map((p: any) => [p.module_id, p])
      );

      const mods: Module[] = (modsRes.data || []).map((m: any) => ({
        id: m.id,
        module_number: m.module_number,
        title: m.title,
        duration_minutes: m.duration_minutes,
        sort_order: m.sort_order,
        content: (m.ce_module_content || []).sort((a: any, b: any) => a.content_order - b.content_order),
        completed: !!(progressMap.get(m.id)?.completed_at),
        started: !!(progressMap.get(m.id)?.started_at),
      }));

      setModules(mods);
      if (mods.length > 0) setActiveModuleId(mods[0].id);

      if (quizRes.data) {
        setQuizId(quizRes.data.id);
        setQuizPassingScore(quizRes.data.passing_score || course?.passing_score || 70);
        const { data: qqs } = await supabase
          .from("ce_quiz_questions")
          .select("*, ce_quiz_question_options(*)")
          .eq("quiz_id", quizRes.data.id)
          .order("sort_order");
        setQuestions((qqs || []).map((q: any) => ({
          ...q,
          options: (q.ce_quiz_question_options || []).sort((a: any, b: any) => a.option_order - b.option_order),
        })));
      }

      setIsLoading(false);
    };
    load();
  }, [id, router]);

  const activeModule = modules.find((m) => m.id === activeModuleId);
  const allModulesComplete = modules.length > 0 && modules.every((m) => m.completed);
  const completedCount = modules.filter((m) => m.completed).length;

  const markModuleComplete = async () => {
    if (!enrollment || !activeModuleId) return;
    setIsCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/ce/course/complete-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: enrollment.id, moduleId: activeModuleId, courseId: id, ceUserId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to mark complete."); return; }

      setModules((prev) => prev.map((m) => m.id === activeModuleId ? { ...m, completed: true } : m));
      setEnrollment((prev) => prev ? { ...prev, progress_percentage: data.progressPercentage, completion_status: data.completionStatus } : prev);

      // Auto-advance to next incomplete module
      const currentIdx = modules.findIndex((m) => m.id === activeModuleId);
      const nextMod = modules.slice(currentIdx + 1).find((m) => !m.completed);
      if (nextMod) setActiveModuleId(nextMod.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const submitQuiz = async () => {
    if (!enrollment || !quizId) return;
    setIsSubmittingQuiz(true);
    setError(null);
    try {
      const res = await fetch("/api/ce/course/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: enrollment.id, quizId, courseId: id, ceUserId, answers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit quiz."); return; }
      setQuizResult({ score: data.score, passed: data.passed, attempts: data.attemptNumber });
      if (data.passed) {
        setEnrollment((prev) => prev ? { ...prev, completion_status: "completed", progress_percentage: 100 } : prev);
      }
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Quiz result view ──
  if (quizResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {quizResult.passed ? (
            <>
              <Award className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Congratulations!</h1>
              <p className="text-muted-foreground mb-2">You passed with a score of <strong>{quizResult.score}%</strong>.</p>
              <p className="text-sm text-muted-foreground mb-6">Your certificate has been issued and is available in your transcript.</p>
              <div className="flex flex-col gap-3">
                <Link href="/ce/transcript"><Button className="w-full">View Certificate</Button></Link>
                <Link href="/ce/my-training"><Button variant="outline" className="w-full">My Training</Button></Link>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Not quite</h1>
              <p className="text-muted-foreground mb-2">You scored <strong>{quizResult.score}%</strong>. Passing score is {quizPassingScore}%.</p>
              <p className="text-sm text-muted-foreground mb-6">Review the course material and try again.</p>
              <div className="flex flex-col gap-3">
                <Button className="w-full" onClick={() => { setQuizResult(null); setAnswers({}); }}>Retry Quiz</Button>
                <Button variant="outline" className="w-full" onClick={() => setQuizView(false)}>Review Modules</Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz taking view ──
  if (quizView && questions.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setQuizView(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm">{courseTitle} — Post-Test</span>
          </div>
          <span className="text-sm text-muted-foreground">{Object.keys(answers).length}/{questions.length} answered</span>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          {questions.map((q, qIdx) => (
            <div key={q.id} className="bg-white border rounded-lg p-5">
              <p className="font-medium text-sm mb-4">
                <span className="text-muted-foreground mr-2">{qIdx + 1}.</span>
                {q.question_text}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      answers[q.id] === opt.option_text
                        ? "bg-red-50 border-red-300"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.option_text}
                      checked={answers[q.id] === opt.option_text}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.option_text }))}
                      className="accent-red-700"
                    />
                    <span className="text-sm">{opt.option_text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              onClick={submitQuiz}
              disabled={isSubmittingQuiz || Object.keys(answers).length < questions.length}
              className="min-w-[140px]"
            >
              {isSubmittingQuiz ? <span className="flex items-center gap-2"><Spinner size="sm" />Submitting...</span> : "Submit Quiz"}
            </Button>
          </div>
          {Object.keys(answers).length < questions.length && (
            <p className="text-xs text-muted-foreground text-center">Answer all {questions.length} questions to submit.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main learn view ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/ce/course/${id}`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-sm truncate max-w-sm">{courseTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {completedCount}/{modules.length} modules
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-red-700 h-1.5 rounded-full transition-all"
              style={{ width: `${enrollment?.progress_percentage || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium">{enrollment?.progress_percentage || 0}%</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r shrink-0 overflow-y-auto">
          <div className="p-4 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course Content</p>
          </div>
          <div className="py-2">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => { setActiveModuleId(mod.id); setQuizView(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  activeModuleId === mod.id && !quizView
                    ? "bg-red-50 text-red-700 border-r-2 border-red-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="shrink-0">
                  {mod.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className={`h-4 w-4 rounded-full border-2 ${activeModuleId === mod.id && !quizView ? "border-red-700" : "border-gray-300"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mod.title}</p>
                  {mod.duration_minutes > 0 && (
                    <p className="text-xs text-muted-foreground">{mod.duration_minutes} min</p>
                  )}
                </div>
              </button>
            ))}

            {/* Quiz button in sidebar */}
            {quizId && questions.length > 0 && (
              <button
                onClick={() => setQuizView(true)}
                disabled={!allModulesComplete}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors border-t mt-2 ${
                  quizView
                    ? "bg-red-50 text-red-700 border-r-2 border-red-700"
                    : allModulesComplete
                      ? "hover:bg-gray-50 text-gray-700"
                      : "text-muted-foreground cursor-not-allowed opacity-60"
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 ${quizView ? "text-red-700" : ""}`} />
                <div>
                  <p className="font-medium">Post-Test</p>
                  {!allModulesComplete && (
                    <p className="text-xs">Complete all modules first</p>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {activeModule ? (
            <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">{activeModule.title}</h1>
                {activeModule.completed && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" /> Completed
                  </span>
                )}
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              {/* Content blocks */}
              {activeModule.content.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p>No content for this module yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeModule.content.map((block) => (
                    <div key={block.id}>
                      {block.title && <h2 className="text-base font-semibold mb-2">{block.title}</h2>}

                      {block.content_type === "text" && block.body && (
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: block.body }}
                        />
                      )}

                      {block.content_type === "video" && block.video_url && (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          {isYoutubeUrl(block.video_url) ? (
                            <iframe
                              src={toEmbedUrl(block.video_url)}
                              className="w-full h-full"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          ) : (
                            <video src={block.video_url} controls className="w-full h-full" />
                          )}
                        </div>
                      )}

                      {block.content_type === "pdf" && block.pdf_url && (
                        <div className="border rounded-lg overflow-hidden">
                          <iframe src={block.pdf_url} className="w-full h-[600px]" />
                        </div>
                      )}

                      {block.content_type === "image" && block.image_url && (
                        <img src={block.image_url} alt={block.title || "Course image"} className="rounded-lg max-w-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Module navigation + completion */}
              <div className="flex items-center justify-between pt-6 border-t">
                <button
                  onClick={() => {
                    const idx = modules.findIndex((m) => m.id === activeModuleId);
                    if (idx > 0) setActiveModuleId(modules[idx - 1].id);
                  }}
                  disabled={modules.findIndex((m) => m.id === activeModuleId) === 0}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                {!activeModule.completed ? (
                  <Button onClick={markModuleComplete} disabled={isCompleting}>
                    {isCompleting
                      ? <span className="flex items-center gap-2"><Spinner size="sm" />Marking...</span>
                      : <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Mark as Complete</span>
                    }
                  </Button>
                ) : allModulesComplete && quizId && questions.length > 0 ? (
                  <Button onClick={() => setQuizView(true)}>
                    Take Post-Test <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <button
                    onClick={() => {
                      const idx = modules.findIndex((m) => m.id === activeModuleId);
                      if (idx < modules.length - 1) setActiveModuleId(modules[idx + 1].id);
                    }}
                    disabled={modules.findIndex((m) => m.id === activeModuleId) === modules.length - 1}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a module to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

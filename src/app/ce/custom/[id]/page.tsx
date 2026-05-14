"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { MaterialViewer } from "@/components/ce/custom-training/material-viewer";
import { QuizRunner } from "@/components/ce/custom-training/quiz-runner";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Material {
  id: string;
  title: string;
  description: string | null;
  content_type: "pdf" | "video_upload" | "video_url" | "scorm";
  content_url: string;
}

interface Quiz {
  pass_threshold: number;
  questions: QuizQuestion[];
}

export default function EmployeeMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/ce/login");
        return;
      }
      const [mat, qz, comp] = await Promise.all([
        supabase
          .from("ce_custom_materials")
          .select("id, title, description, content_type, content_url")
          .eq("id", materialId)
          .single(),
        supabase
          .from("ce_custom_quizzes")
          .select("pass_threshold, questions")
          .eq("material_id", materialId)
          .maybeSingle(),
        supabase
          .from("ce_custom_completions")
          .select("completed_at")
          .eq("material_id", materialId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setMaterial(mat.data as Material);
      setQuiz(qz.data as Quiz | null);
      setCompleted(!!comp.data?.completed_at);
      setLoading(false);
    };
    load();
  }, [materialId, router]);

  const onViewed = useCallback(async () => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "viewed" }),
    });
    if (res.ok) {
      const { completion } = await res.json();
      if (completion.completed_at) setCompleted(true);
    }
  }, [materialId]);

  const submitQuiz = async (answers: number[]) => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "quiz_submit", answers }),
    });
    const { completion } = await res.json();
    const passed = !!completion.quiz_passed_at;
    if (completion.completed_at) setCompleted(true);
    return { score: completion.quiz_score ?? 0, passed };
  };

  if (loading || !material) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <button
        onClick={() => router.push("/ce/my-training")}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my training
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{material.title}</h1>
          {material.description && (
            <p className="text-muted-foreground text-sm mt-1">{material.description}</p>
          )}
        </div>
        {completed && (
          <span className="shrink-0 inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        )}
      </div>

      <MaterialViewer
        contentType={material.content_type}
        contentUrl={material.content_url}
        onViewed={onViewed}
      />

      {quiz && quiz.questions.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Knowledge check</h2>
          <QuizRunner
            questions={quiz.questions}
            threshold={quiz.pass_threshold}
            onSubmit={submitQuiz}
          />
        </div>
      )}
    </div>
  );
}

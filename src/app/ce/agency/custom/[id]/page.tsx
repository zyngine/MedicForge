"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ArrowLeft, Trash2 } from "lucide-react";
import { QuizEditor } from "@/components/ce/custom-training/quiz-editor";
import { MaterialViewer } from "@/components/ce/custom-training/material-viewer";
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

interface Assignment {
  id: string;
  target_type: string;
  target_value: string | null;
  assigned_at: string;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  certification_level: string | null;
}

interface ReportRow {
  user: Employee;
  completion: {
    viewed_at: string | null;
    quiz_score: number | null;
    completed_at: string | null;
  } | null;
}

type Tab = "content" | "quiz" | "assignments" | "report";

const TAB_LABELS: Record<Tab, string> = {
  content: "Content",
  quiz: "Quiz",
  assignments: "Assignments",
  report: "Report",
};

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;
  const [tab, setTab] = useState<Tab>("content");
  const [material, setMaterial] = useState<Material | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certLevels, setCertLevels] = useState<string[]>([]);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createCEClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ce } = await supabase
      .from("ce_users")
      .select("agency_id")
      .eq("id", user.id)
      .single();
    if (!ce?.agency_id) return;

    const [mat, qz, asn, emp] = await Promise.all([
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
        .from("ce_custom_assignments")
        .select("id, target_type, target_value, assigned_at")
        .eq("material_id", materialId),
      supabase
        .from("ce_users")
        .select("id, first_name, last_name, email, certification_level")
        .eq("agency_id", ce.agency_id),
    ]);
    setMaterial(mat.data as Material);
    setQuiz(qz.data as Quiz | null);
    setAssignments(asn.data || []);
    setEmployees(emp.data || []);
    setCertLevels(
      Array.from(
        new Set(
          ((emp.data || []) as Employee[])
            .map((e) => e.certification_level)
            .filter((c): c is string => !!c),
        ),
      ),
    );
    setLoading(false);
  }, [materialId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadReport = useCallback(async () => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/report`);
    if (res.ok) {
      const { rows } = await res.json();
      setReportRows(rows);
    }
  }, [materialId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "report") loadReport();
  }, [tab, loadReport]);

  const saveQuiz = async (questions: QuizQuestion[], threshold: number) => {
    await fetch(`/api/ce/agency/custom/materials/${materialId}/quiz`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass_threshold: threshold, questions }),
    });
    setQuiz({ pass_threshold: threshold, questions });
  };

  const deleteQuiz = async () => {
    if (!confirm("Delete this quiz?")) return;
    await fetch(`/api/ce/agency/custom/materials/${materialId}/quiz`, { method: "DELETE" });
    setQuiz(null);
  };

  const addAssignment = async (target_type: string, target_value: string | null) => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: [{ target_type, target_value }] }),
    });
    if (res.ok) load();
  };

  const removeAssignment = async (assignmentId: string) => {
    await fetch(`/api/ce/agency/custom/materials/${materialId}/assignments/${assignmentId}`, {
      method: "DELETE",
    });
    setAssignments((a) => a.filter((x) => x.id !== assignmentId));
  };

  if (loading || !material) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/ce/agency/custom")}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to materials
      </button>

      <div>
        <h1 className="text-2xl font-bold">{material.title}</h1>
        {material.description && (
          <p className="text-muted-foreground text-sm mt-1">{material.description}</p>
        )}
      </div>

      <div className="border-b">
        <div className="flex gap-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === "content" && (
        <MaterialViewer contentType={material.content_type} contentUrl={material.content_url} />
      )}

      {tab === "quiz" && (
        <QuizEditor
          initialQuestions={quiz?.questions || []}
          initialThreshold={quiz?.pass_threshold || 80}
          onSave={saveQuiz}
          onDelete={quiz ? deleteQuiz : undefined}
        />
      )}

      {tab === "assignments" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Add assignment</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addAssignment("all_agency", null)}>
                + Assign to All Employees
              </Button>
              {certLevels.map((c) => (
                <Button key={c} variant="outline" size="sm" onClick={() => addAssignment("certification", c)}>
                  + All {c}
                </Button>
              ))}
            </div>
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Assign by individual employee
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1 max-h-48 overflow-auto">
                {employees.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => addAssignment("user", e.id)}
                    className="text-left text-xs p-1.5 hover:bg-muted rounded"
                  >
                    {e.first_name} {e.last_name}{" "}
                    <span className="text-muted-foreground">({e.email})</span>
                  </button>
                ))}
              </div>
            </details>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Target</th>
                  <th className="text-left p-2">Assigned</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground text-sm">
                      No assignments yet
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => {
                    let label = "";
                    if (a.target_type === "all_agency") label = "All agency employees";
                    else if (a.target_type === "certification") label = `All ${a.target_value} certified`;
                    else if (a.target_type === "user") {
                      const e = employees.find((x) => x.id === a.target_value);
                      label = e ? `${e.first_name} ${e.last_name}` : a.target_value || "";
                    }
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="p-2">{label}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {new Date(a.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removeAssignment(a.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "report" && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Viewed</th>
                <th className="text-left p-2">Quiz Score</th>
                <th className="text-left p-2">Completed</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">
                    No employees assigned yet
                  </td>
                </tr>
              ) : (
                reportRows.map((r) => (
                  <tr key={r.user.id} className="border-t">
                    <td className="p-2">
                      {r.user.first_name} {r.user.last_name}{" "}
                      <span className="text-xs text-muted-foreground">{r.user.email}</span>
                    </td>
                    <td className="p-2 text-xs">
                      {r.completion?.viewed_at ? new Date(r.completion.viewed_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-2 text-xs">
                      {r.completion?.quiz_score != null ? `${r.completion.quiz_score}%` : "—"}
                    </td>
                    <td className="p-2 text-xs">
                      {r.completion?.completed_at
                        ? new Date(r.completion.completed_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

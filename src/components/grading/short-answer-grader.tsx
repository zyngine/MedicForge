"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Spinner,
  Alert,
} from "@/components/ui";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import {
  gradeQuizAnswers,
  finalizeQuizScore,
  safeParseAnswer,
  shortAnswerMatches,
  toPercentage,
  type GradableQuestion,
  type QuestionGrades,
} from "@/lib/quiz-grading";

interface Props {
  submissionId: string;
  assignmentId: string;
  /** Called with the finalized score once the instructor saves. */
  onGraded?: (result: { score: number; totalPoints: number; percentage: number }) => void;
}

interface QuestionRow {
  id: string;
  question_text: string;
  question_type: GradableQuestion["question_type"];
  points: number | null;
  order_index: number | null;
  correct_answer: unknown;
}

interface PendingItem {
  question: QuestionRow;
  studentAnswer: string;
  maxPoints: number;
}

/** The answers a student submitted, as stored in submissions.content. */
function extractAnswers(content: unknown): Record<string, number | string> {
  let parsed: unknown = content;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (parsed && typeof parsed === "object" && "answers" in parsed) {
    const answers = (parsed as { answers?: unknown }).answers;
    if (answers && typeof answers === "object") {
      return answers as Record<string, number | string>;
    }
  }
  return {};
}

/** Grades an instructor previously saved, so re-opening a submission shows them. */
function extractSavedGrades(feedback: unknown): {
  grades: QuestionGrades;
  comments: Record<string, string>;
} {
  const empty = { grades: {}, comments: {} };
  if (!feedback || typeof feedback !== "object") return empty;
  const fb = feedback as { question_grades?: unknown; question_comments?: unknown };
  return {
    grades:
      fb.question_grades && typeof fb.question_grades === "object"
        ? (fb.question_grades as QuestionGrades)
        : {},
    comments:
      fb.question_comments && typeof fb.question_comments === "object"
        ? (fb.question_comments as Record<string, string>)
        : {},
  };
}

/**
 * Mark the written answers on a quiz submission.
 *
 * Only questions the auto-grader could not settle appear here — a short answer
 * matching the expected text is already credited and is not the instructor's
 * problem. Everything objective keeps the score it was given on submission.
 */
export function ShortAnswerGrader({ submissionId, assignmentId, onGraded }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [pending, setPending] = React.useState<PendingItem[]>([]);
  const [autoScore, setAutoScore] = React.useState(0);
  const [awards, setAwards] = React.useState<Record<string, string>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      const [{ data: submission, error: subError }, { data: questionRows, error: qError }] =
        await Promise.all([
          supabase
            .from("submissions")
            .select("id, content, feedback, raw_score")
            .eq("id", submissionId)
            .maybeSingle(),
          supabase
            .from("quiz_questions")
            .select("id, question_text, question_type, points, order_index, correct_answer")
            .eq("assignment_id", assignmentId)
            .order("order_index", { ascending: true }),
        ]);

      if (cancelled) return;

      if (subError || qError) {
        setError(subError?.message || qError?.message || "Could not load this submission");
        setLoading(false);
        return;
      }

      const qs = (questionRows || []) as QuestionRow[];
      const answers = extractAnswers(submission?.content);

      const answerMap = new Map<string, unknown>(
        qs.map((q) => [
          q.id,
          typeof q.correct_answer === "string"
            ? safeParseAnswer(q.correct_answer)
            : q.correct_answer,
        ])
      );

      // Recomputed rather than trusted from the row: the questions may have been
      // edited since submission, and the instructor should be marking against
      // what the quiz says now.
      const graded = gradeQuizAnswers(qs, answers, answerMap);

      const items: PendingItem[] = graded.pendingQuestionIds.map((id) => {
        const question = qs.find((q) => q.id === id)!;
        const raw = answers[id];
        return {
          question,
          studentAnswer: raw === undefined || raw === null ? "" : String(raw),
          maxPoints: question.points ?? 1,
        };
      });

      const saved = extractSavedGrades(submission?.feedback);

      setQuestions(qs);
      setPending(items);
      setAutoScore(graded.score);
      setAwards(
        Object.fromEntries(
          items.map((item) => [
            item.question.id,
            saved.grades[item.question.id] !== undefined
              ? String(saved.grades[item.question.id])
              : "",
          ])
        )
      );
      setComments(saved.comments);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [submissionId, assignmentId]);

  const award = (questionId: string, value: string) =>
    setAwards((prev) => ({ ...prev, [questionId]: value }));

  const numericGrades: QuestionGrades = React.useMemo(() => {
    const out: QuestionGrades = {};
    for (const [id, value] of Object.entries(awards)) {
      if (value.trim() === "") continue;
      const n = Number(value);
      if (Number.isFinite(n)) out[id] = n;
    }
    return out;
  }, [awards]);

  const allMarked = pending.every((item) => awards[item.question.id]?.trim() !== "");
  const preview = finalizeQuizScore(autoScore, numericGrades, questions);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { score, totalPoints } = finalizeQuizScore(autoScore, numericGrades, questions);
      const percentage = toPercentage(score, totalPoints);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          raw_score: score,
          final_score: percentage,
          status: "graded",
          graded_by: user?.id ?? null,
          graded_at: new Date().toISOString(),
          feedback: {
            question_grades: numericGrades,
            question_comments: comments,
            auto_graded_points: autoScore,
          },
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      onGraded?.({ score, totalPoints, percentage });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save these marks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (pending.length === 0) {
    return (
      <Alert variant="info">
        Nothing to mark here — every question on this submission was graded automatically.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted">
        <div>
          <p className="text-sm text-muted-foreground">Graded automatically</p>
          <p className="font-medium">{autoScore} points</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Score with your marks</p>
          <p className="font-medium">
            {preview.score} / {preview.totalPoints} ({toPercentage(preview.score, preview.totalPoints)}%)
          </p>
        </div>
      </div>

      {pending.map((item, index) => {
        const expected =
          typeof item.question.correct_answer === "string"
            ? String(safeParseAnswer(item.question.correct_answer))
            : String(item.question.correct_answer ?? "");
        const blank = item.studentAnswer.trim() === "";
        const close = shortAnswerMatches(item.studentAnswer, expected);

        return (
          <div key={item.question.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Question {index + 1} of {pending.length} to mark
                </p>
                <p className="font-medium">{item.question.question_text}</p>
              </div>
              <Badge variant="outline">{item.maxPoints} pts</Badge>
            </div>

            <div className="space-y-2">
              <Label>Student&apos;s answer</Label>
              {blank ? (
                <p className="text-sm text-muted-foreground italic p-3 rounded-md bg-muted/50">
                  Left blank
                </p>
              ) : (
                <p className="text-sm p-3 rounded-md bg-muted/50 whitespace-pre-wrap">
                  {item.studentAnswer}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Expected answer</Label>
              <p className="text-sm p-3 rounded-md bg-success/5 border border-success/20 whitespace-pre-wrap">
                {expected || <span className="text-muted-foreground italic">Not set</span>}
              </p>
              {close && (
                <p className="text-xs text-success">
                  Matches the expected answer exactly.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor={`award-${item.question.id}`}>Points awarded</Label>
                <Input
                  id={`award-${item.question.id}`}
                  type="number"
                  min={0}
                  max={item.maxPoints}
                  step="0.5"
                  className="w-28"
                  value={awards[item.question.id] ?? ""}
                  onChange={(e) => award(item.question.id, e.target.value)}
                  placeholder={`0-${item.maxPoints}`}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => award(item.question.id, String(item.maxPoints))}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Full credit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => award(item.question.id, "0")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                No credit
              </Button>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`comment-${item.question.id}`}
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                Comment for the student (optional)
              </Label>
              <Textarea
                id={`comment-${item.question.id}`}
                rows={2}
                value={comments[item.question.id] ?? ""}
                onChange={(e) =>
                  setComments((prev) => ({ ...prev, [item.question.id]: e.target.value }))
                }
                placeholder="What was missing, or what they got right"
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {allMarked
            ? "All answers marked."
            : `${pending.filter((i) => awards[i.question.id]?.trim() === "").length} still to mark.`}
        </p>
        <Button onClick={handleSave} disabled={saving || !allMarked}>
          {saving ? <Spinner size="sm" className="mr-2" /> : null}
          Save Marks &amp; Release Score
        </Button>
      </div>
    </div>
  );
}

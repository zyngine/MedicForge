"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { FileText, Download, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSimilarityRating } from "@/lib/plagiarism-utils";

interface Props {
  submissionId: string;
}

interface SubmissionRow {
  id: string;
  content: unknown;
  file_urls: string[] | null;
}

interface PlagiarismCheckRow {
  id: string;
  status: string;
  similarity_score: number | null;
  checked_at: string | null;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.html === "string") {
      return String(obj.html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
  }
  return "";
}

export function SubmissionPreview({ submissionId }: Props) {
  const [submission, setSubmission] = React.useState<SubmissionRow | null>(null);
  const [check, setCheck] = React.useState<PlagiarismCheckRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const [{ data: sub }, { data: chk }] = await Promise.all([
      supabase.from("submissions").select("id, content, file_urls").eq("id", submissionId).maybeSingle(),
      supabase.from("plagiarism_checks").select("id, status, similarity_score, checked_at").eq("submission_id", submissionId).maybeSingle(),
    ]);
    setSubmission(sub as SubmissionRow | null);
    setCheck(chk as PlagiarismCheckRow | null);
    setLoading(false);
  }, [submissionId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const runCheck = async () => {
    setRunning(true);
    setError(null);
    const res = await fetch("/api/plagiarism/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Plagiarism check failed.");
      setRunning(false);
      return;
    }
    await refresh();
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }
  if (!submission) return null;

  const text = extractText(submission.content);
  const files = Array.isArray(submission.file_urls) ? submission.file_urls : [];
  const hasContent = text.trim().length > 0 || files.length > 0;
  const rating = check?.similarity_score != null ? getSimilarityRating(check.similarity_score) : null;

  if (!hasContent) {
    return (
      <div className="border rounded-md p-4 text-sm text-muted-foreground italic">
        Student didn&apos;t attach written content or files for this submission.
      </div>
    );
  }

  return (
    <div className="space-y-3 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Submission content</p>
        {text.trim().length >= 20 && (
          <div className="flex items-center gap-2">
            {check?.status === "completed" && rating && (
              <span
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  rating.level === "low"
                    ? "bg-green-100 text-green-700"
                    : rating.level === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : rating.level === "high"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                }`}
              >
                {rating.level === "low" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {check.similarity_score?.toFixed(0)}% similarity — {rating.label}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={runCheck} disabled={running}>
              {running ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1" />
                  {check ? "Re-run check" : "Run plagiarism check"}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {text.trim() && (
        <div className="bg-card border rounded p-3 max-h-64 overflow-auto">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((url) => {
            const name = (url.split("/").pop() || url).split("?")[0];
            return (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {name}
                <Download className="h-3 w-3 opacity-60" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import {
  FileText,
  Download,
  Search,
  Globe,
  Brain,
  Paperclip,
  Quote,
} from "lucide-react";
import { getSimilarityRating } from "@/lib/plagiarism-utils";

interface Props {
  submissionId: string;
}

interface SubmissionRow {
  id: string;
  content: unknown;
  file_urls: string[] | string | null;
}

interface WebMatch {
  title: string;
  url: string;
  snippet: string;
  matchedQuery: string;
}

interface ParsedFileInfo {
  url: string;
  fileName: string;
  wordCount: number;
}

interface PlagiarismCheckRow {
  id: string;
  status: string;
  similarity_score: number | null;
  ai_score: number | null;
  ai_provider: string | null;
  web_match_count: number | null;
  web_matches: WebMatch[] | null;
  parsed_files: ParsedFileInfo[] | null;
  citations_removed_words: number | null;
  matches: Array<{ sourceTitle: string; similarity: number; sourceType: string }> | null;
  checked_at: string | null;
  error_message: string | null;
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

function extractFileUrls(file_urls: unknown): string[] {
  if (Array.isArray(file_urls)) return file_urls.filter((u): u is string => typeof u === "string");
  if (typeof file_urls === "string") {
    try {
      const parsed = JSON.parse(file_urls);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function aiBand(score: number): { label: string; color: string } {
  if (score < 25) return { label: "Likely human", color: "bg-green-100 text-green-700" };
  if (score < 50) return { label: "Possibly AI", color: "bg-yellow-100 text-yellow-700" };
  if (score < 75) return { label: "Probably AI", color: "bg-orange-100 text-orange-700" };
  return { label: "Very likely AI", color: "bg-red-100 text-red-700" };
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
      supabase
        .from("plagiarism_checks")
        .select(
          "id, status, similarity_score, ai_score, ai_provider, web_match_count, web_matches, parsed_files, citations_removed_words, matches, checked_at, error_message",
        )
        .eq("submission_id", submissionId)
        .maybeSingle(),
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
  const files = extractFileUrls(submission.file_urls);
  const hasContent = text.trim().length > 0 || files.length > 0;

  if (!hasContent) {
    return (
      <div className="border rounded-md p-4 text-sm text-muted-foreground italic">
        Student didn&apos;t attach written content or files for this submission.
      </div>
    );
  }

  const similarityRating = check?.similarity_score != null ? getSimilarityRating(check.similarity_score) : null;
  const ai = check?.ai_score != null ? aiBand(check.ai_score) : null;
  const internalMatches = check?.matches || [];
  const webMatches = check?.web_matches || [];
  const parsedFiles = check?.parsed_files || [];

  return (
    <div className="space-y-3 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Submission content</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={runCheck} disabled={running}>
            {running ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                {check ? "Re-run integrity check" : "Run integrity check"}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Headline scores */}
      {check?.status === "completed" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {similarityRating && (
            <div
              className={`rounded-lg border p-2 ${
                similarityRating.level === "low"
                  ? "bg-green-50 border-green-200"
                  : similarityRating.level === "medium"
                    ? "bg-yellow-50 border-yellow-200"
                    : similarityRating.level === "high"
                      ? "bg-orange-50 border-orange-200"
                      : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-muted-foreground">Similarity</p>
              <p className="font-semibold text-base">{check.similarity_score?.toFixed(0)}%</p>
              <p className="text-[10px] uppercase tracking-wide">{similarityRating.label}</p>
            </div>
          )}
          {ai && (
            <div className={`rounded-lg border p-2 ${ai.color}`}>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Brain className="h-3 w-3" />
                AI likelihood
              </p>
              <p className="font-semibold text-base">{check.ai_score?.toFixed(0)}%</p>
              <p className="text-[10px] uppercase tracking-wide">{ai.label}</p>
            </div>
          )}
          <div className="rounded-lg border p-2 bg-card">
            <p className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              Internal matches
            </p>
            <p className="font-semibold text-base">{internalMatches.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">past work + sources</p>
          </div>
          <div className="rounded-lg border p-2 bg-card">
            <p className="flex items-center gap-1 text-muted-foreground">
              <Globe className="h-3 w-3" />
              Web hits
            </p>
            <p className="font-semibold text-base">{check.web_match_count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {check.web_match_count === null ? "not configured" : "verbatim phrases"}
            </p>
          </div>
        </div>
      )}

      {check?.status === "processing" && (
        <p className="text-xs text-muted-foreground italic flex items-center gap-2">
          <Spinner size="sm" />
          Running… checking internal sources, the web, and AI-generation signals.
        </p>
      )}

      {check?.citations_removed_words ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Quote className="h-3 w-3" />
          Excluded {check.citations_removed_words} words inside properly-cited quotes from the similarity score.
        </p>
      ) : null}

      {parsedFiles.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          Included text from {parsedFiles.length} uploaded file{parsedFiles.length === 1 ? "" : "s"} ({parsedFiles.map((f) => f.fileName).join(", ")}).
        </p>
      )}

      {internalMatches.length > 0 && (
        <details className="text-xs" open={internalMatches.length <= 3}>
          <summary className="cursor-pointer font-medium text-foreground">
            Internal matches ({internalMatches.length})
          </summary>
          <ul className="mt-1 space-y-1 pl-4">
            {internalMatches.slice(0, 10).map((m, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="font-medium text-foreground">{m.similarity.toFixed(0)}%</span> match against{" "}
                <span className="italic">{m.sourceTitle}</span>{" "}
                <span className="text-[10px]">({m.sourceType})</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {webMatches.length > 0 && (
        <details className="text-xs" open>
          <summary className="cursor-pointer font-medium text-foreground">
            Web matches ({webMatches.length})
          </summary>
          <ul className="mt-1 space-y-2 pl-4">
            {webMatches.slice(0, 8).map((m, i) => (
              <li key={i}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline font-medium"
                >
                  {m.title}
                </a>
                <p className="text-muted-foreground line-clamp-2">{m.snippet}</p>
                <p className="text-[10px] text-muted-foreground italic">
                  matched phrase: &quot;{m.matchedQuery}&quot;
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

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

      {check?.status === "completed" && check.checked_at && (
        <p className="text-[10px] text-muted-foreground">
          Last checked {new Date(check.checked_at).toLocaleString()}
          {check.ai_provider && check.ai_provider !== "local" && ` · AI via ${check.ai_provider}`}
          {check.ai_provider === "local" && ` · AI via local heuristic`}
        </p>
      )}
    </div>
  );
}

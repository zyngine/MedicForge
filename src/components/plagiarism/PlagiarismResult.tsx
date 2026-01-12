"use client";

import { AlertTriangle, CheckCircle, FileText, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { PlagiarismCheck } from "@/lib/hooks/use-plagiarism";
import { getSimilarityRating, PlagiarismMatch } from "@/lib/plagiarism-utils";
import { format } from "date-fns";

interface PlagiarismResultProps {
  check: PlagiarismCheck;
}

export function PlagiarismResult({ check }: PlagiarismResultProps) {
  if (check.status === "pending" || check.status === "processing") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-2 text-sm text-muted-foreground">
            {check.status === "pending" ? "Check pending..." : "Processing..."}
          </p>
        </div>
      </div>
    );
  }

  if (check.status === "failed") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <p className="mt-2 text-sm text-red-600">
            {check.error_message || "Plagiarism check failed"}
          </p>
        </div>
      </div>
    );
  }

  const rating = check.similarity_score !== null
    ? getSimilarityRating(check.similarity_score)
    : null;

  const matches = (check.matches || []) as PlagiarismMatch[];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
        <div className="flex-shrink-0">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              rating?.level === "low"
                ? "bg-green-100"
                : rating?.level === "medium"
                ? "bg-yellow-100"
                : rating?.level === "high"
                ? "bg-orange-100"
                : "bg-red-100"
            }`}
          >
            <span
              className={`text-2xl font-bold ${
                rating?.level === "low"
                  ? "text-green-700"
                  : rating?.level === "medium"
                  ? "text-yellow-700"
                  : rating?.level === "high"
                  ? "text-orange-700"
                  : "text-red-700"
              }`}
            >
              {check.similarity_score?.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {rating?.level === "low" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            <span className="font-medium">{rating?.label}</span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              {check.word_count?.toLocaleString()} words analyzed
            </p>
            {check.checked_at && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Checked {format(new Date(check.checked_at), "MMM d, yyyy h:mm a")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Matches */}
      {matches.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-medium">Sources Found ({matches.length})</h3>
          {matches.map((match, index) => (
            <Card key={index}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{match.sourceTitle}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {match.sourceType}
                    </Badge>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      match.similarity < 15
                        ? "text-green-600"
                        : match.similarity < 30
                        ? "text-yellow-600"
                        : match.similarity < 50
                        ? "text-orange-600"
                        : "text-red-600"
                    }`}
                  >
                    {match.similarity.toFixed(1)}% match
                  </span>
                </div>
              </CardHeader>
              {match.matchedSnippets && match.matchedSnippets.length > 0 && (
                <CardContent className="py-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Matched Passages ({match.matchedSnippets.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {match.matchedSnippets.slice(0, 5).map((snippet, snippetIndex) => (
                      <div
                        key={snippetIndex}
                        className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded"
                      >
                        <p className="text-yellow-800">"{snippet.original}"</p>
                      </div>
                    ))}
                    {match.matchedSnippets.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{match.matchedSnippets.length - 5} more passages
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">No significant matches found</p>
        </div>
      )}
    </div>
  );
}

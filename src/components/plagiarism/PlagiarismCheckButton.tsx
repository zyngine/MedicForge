"use client";

import { useState } from "react";
import { Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useRunPlagiarismCheck, usePlagiarismCheck } from "@/lib/hooks/use-plagiarism";
import { getSimilarityRating } from "@/lib/plagiarism-utils";
import { PlagiarismResult } from "./PlagiarismResult";

interface PlagiarismCheckButtonProps {
  submissionId: string;
  content: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export function PlagiarismCheckButton({
  submissionId,
  content,
  variant = "outline",
  size = "default",
}: PlagiarismCheckButtonProps) {
  const [showResults, setShowResults] = useState(false);
  const { data: existingCheck, isLoading: checkLoading } = usePlagiarismCheck(submissionId);
  const { mutate: runCheck, isPending } = useRunPlagiarismCheck();

  const handleCheck = () => {
    runCheck(
      { submissionId, content },
      {
        onSuccess: () => {
          setShowResults(true);
        },
      }
    );
  };

  const hasResults = existingCheck?.status === "completed";
  const rating = hasResults && existingCheck.similarity_score !== null
    ? getSimilarityRating(existingCheck.similarity_score)
    : null;

  if (checkLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {hasResults && rating && (
          <button
            onClick={() => setShowResults(true)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${
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
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {existingCheck.similarity_score?.toFixed(1)}%
          </button>
        )}
        <Button
          variant={variant}
          size={size}
          onClick={handleCheck}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Search className="h-4 w-4 mr-1" />
          )}
          {hasResults ? "Re-check" : "Check Plagiarism"}
        </Button>
      </div>

      <Modal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        title="Plagiarism Check Results"
        size="lg"
      >
        {existingCheck && (
          <PlagiarismResult check={existingCheck} />
        )}
      </Modal>
    </>
  );
}

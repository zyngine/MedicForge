"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Check,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuestionStatus = "unanswered" | "answered" | "flagged" | "current";

interface Question {
  id: string;
  number: number;
  status: QuestionStatus;
}

interface QuestionNavigationProps {
  questions: Question[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onFlag?: (index: number) => void;
  showPrevNext?: boolean;
  className?: string;
}

export function QuestionNavigation({
  questions,
  currentIndex,
  onNavigate,
  onFlag,
  showPrevNext = true,
  className,
}: QuestionNavigationProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < questions.length - 1;

  const getStatusIcon = (status: QuestionStatus) => {
    switch (status) {
      case "answered":
        return <Check className="h-3 w-3" />;
      case "flagged":
        return <Flag className="h-3 w-3" />;
      case "current":
        return <Circle className="h-3 w-3 fill-current" />;
      default:
        return null;
    }
  };

  const getStatusStyles = (status: QuestionStatus, isCurrent: boolean) => {
    if (isCurrent) {
      return "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2";
    }

    switch (status) {
      case "answered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700";
      case "flagged":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700";
      default:
        return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Question Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={question.id}
              onClick={() => onNavigate(index)}
              className={cn(
                "relative w-10 h-10 rounded-lg border font-medium text-sm transition-all",
                "flex items-center justify-center",
                getStatusStyles(question.status, isCurrent)
              )}
              aria-label={`Question ${question.number}${
                question.status === "answered" ? ", answered" : ""
              }${question.status === "flagged" ? ", flagged for review" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {question.number}
              {question.status !== "unanswered" && question.status !== "current" && (
                <span className="absolute -top-1 -right-1">
                  {getStatusIcon(question.status)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      {showPrevNext && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {onFlag && (
            <Button
              variant="outline"
              onClick={() => onFlag(currentIndex)}
              className={cn(
                questions[currentIndex]?.status === "flagged" &&
                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
            >
              <Flag className="h-4 w-4 mr-1" />
              {questions[currentIndex]?.status === "flagged" ? "Unflag" : "Flag for Review"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted border" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-green-800 dark:text-green-400" />
          </div>
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 flex items-center justify-center">
            <Flag className="h-2.5 w-2.5 text-yellow-800 dark:text-yellow-400" />
          </div>
          <span>Flagged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}

// Hook for managing question navigation state
export function useQuestionNavigation<T extends { id: string }>(
  questions: T[],
  initialIndex = 0
) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [answers, setAnswers] = React.useState<Map<string, unknown>>(new Map());
  const [flagged, setFlagged] = React.useState<Set<string>>(new Set());

  const currentQuestion = questions[currentIndex];

  const getQuestionStatus = React.useCallback(
    (questionId: string, index: number): QuestionStatus => {
      if (index === currentIndex) return "current";
      if (flagged.has(questionId)) return "flagged";
      if (answers.has(questionId)) return "answered";
      return "unanswered";
    },
    [currentIndex, answers, flagged]
  );

  const questionsWithStatus = React.useMemo(
    () =>
      questions.map((q, index) => ({
        id: q.id,
        number: index + 1,
        status: getQuestionStatus(q.id, index),
      })),
    [questions, getQuestionStatus]
  );

  const navigate = React.useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
      }
    },
    [questions.length]
  );

  const goNext = React.useCallback(() => {
    navigate(currentIndex + 1);
  }, [currentIndex, navigate]);

  const goPrev = React.useCallback(() => {
    navigate(currentIndex - 1);
  }, [currentIndex, navigate]);

  const toggleFlag = React.useCallback(
    (index?: number) => {
      const targetIndex = index ?? currentIndex;
      const questionId = questions[targetIndex]?.id;
      if (!questionId) return;

      setFlagged((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(questionId)) {
          newSet.delete(questionId);
        } else {
          newSet.add(questionId);
        }
        return newSet;
      });
    },
    [currentIndex, questions]
  );

  const setAnswer = React.useCallback(
    (questionId: string, answer: unknown) => {
      setAnswers((prev) => {
        const newMap = new Map(prev);
        if (answer === null || answer === undefined) {
          newMap.delete(questionId);
        } else {
          newMap.set(questionId, answer);
        }
        return newMap;
      });
    },
    []
  );

  const getAnswer = React.useCallback(
    (questionId: string) => answers.get(questionId),
    [answers]
  );

  const progress = React.useMemo(() => {
    const answered = answers.size;
    const total = questions.length;
    const flaggedCount = flagged.size;
    const unanswered = total - answered;

    return {
      answered,
      unanswered,
      flagged: flaggedCount,
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
    };
  }, [answers.size, questions.length, flagged.size]);

  return {
    currentIndex,
    currentQuestion,
    questionsWithStatus,
    progress,
    answers,
    flagged,
    navigate,
    goNext,
    goPrev,
    toggleFlag,
    setAnswer,
    getAnswer,
    canGoNext: currentIndex < questions.length - 1,
    canGoPrev: currentIndex > 0,
  };
}

// Progress summary component
export function QuestionProgress({
  answered,
  unanswered,
  flagged,
  total,
  className,
}: {
  answered: number;
  unanswered: number;
  flagged: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-1.5">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span>{answered} answered</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Circle className="h-4 w-4 text-muted-foreground" />
        <span>{unanswered} remaining</span>
      </div>
      {flagged > 0 && (
        <div className="flex items-center gap-1.5">
          <Flag className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span>{flagged} flagged</span>
        </div>
      )}
    </div>
  );
}

// Floating navigation for mobile
export function FloatingQuestionNav({
  currentIndex,
  total,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  className,
}: {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background border rounded-full shadow-lg px-2 py-1 z-50",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="h-8 w-8 rounded-full"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="px-2 font-medium text-sm">
        {currentIndex + 1} / {total}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!canGoNext}
        className="h-8 w-8 rounded-full"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

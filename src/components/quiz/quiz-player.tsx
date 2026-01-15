"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Alert,
} from "@/components/ui";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import { QuizTimer, useQuizTimer } from "./quiz-timer";
import { cn } from "@/lib/utils";

export interface QuizQuestionData {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  options: string[] | null;
  points: number;
  order_index: number;
}

export interface QuizAnswer {
  questionId: string;
  answer: number | string | null;
  flagged: boolean;
}

interface QuizPlayerProps {
  questions: QuizQuestionData[];
  timeLimit?: number; // in minutes
  onSubmit: (answers: QuizAnswer[]) => Promise<void>;
  onAutoSave?: (answers: QuizAnswer[]) => void;
  initialAnswers?: QuizAnswer[];
  shuffleQuestions?: boolean;
}

export function QuizPlayer({
  questions,
  timeLimit,
  onSubmit,
  onAutoSave,
  initialAnswers,
  shuffleQuestions = false,
}: QuizPlayerProps) {
  // Shuffle questions if needed (only once on mount)
  const [orderedQuestions] = React.useState(() => {
    if (shuffleQuestions) {
      return [...questions].sort(() => Math.random() - 0.5);
    }
    return questions;
  });

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<QuizAnswer[]>(() => {
    if (initialAnswers && initialAnswers.length > 0) {
      return initialAnswers;
    }
    return orderedQuestions.map((q) => ({
      questionId: q.id,
      answer: null,
      flagged: false,
    }));
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Timer
  const timeLimitSeconds = timeLimit ? timeLimit * 60 : 0;
  const timer = useQuizTimer(timeLimitSeconds);

  const currentQuestion = orderedQuestions[currentIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);

  // Auto-save on answer change
  const lastSaveRef = React.useRef<string>("");
  React.useEffect(() => {
    const answersJson = JSON.stringify(answers);
    if (answersJson !== lastSaveRef.current && onAutoSave) {
      lastSaveRef.current = answersJson;
      const timeout = setTimeout(() => {
        onAutoSave(answers);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [answers, onAutoSave]);

  // Handle time up
  React.useEffect(() => {
    if (timer.isTimeUp && !isSubmitting) {
      handleSubmit();
    }
  }, [timer.isTimeUp]);

  const updateAnswer = (questionId: string, answer: number | string | null) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, answer } : a
      )
    );
  };

  const toggleFlag = (questionId: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, flagged: !a.flagged } : a
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
      setIsSubmitting(false);
    }
  };

  const answeredCount = answers.filter((a) => a.answer !== null).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;
  const progressPercent = (answeredCount / orderedQuestions.length) * 100;

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < orderedQuestions.length) {
      setCurrentIndex(index);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No questions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header with Timer and Progress */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            Question {currentIndex + 1} of {orderedQuestions.length}
          </Badge>
          <Badge variant="info" className="text-sm">
            {answeredCount} Answered
          </Badge>
          {flaggedCount > 0 && (
            <Badge variant="warning" className="text-sm">
              <Flag className="h-3 w-3 mr-1" />
              {flaggedCount} Flagged
            </Badge>
          )}
        </div>
        {timeLimit && timeLimit > 0 && (
          <QuizTimer
            totalSeconds={timeLimitSeconds}
            onTimeUp={timer.handleTimeUp}
            onTick={timer.handleTick}
            isPaused={timer.isPaused}
          />
        )}
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} size="sm" />

      {/* Question Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        {orderedQuestions.map((q, idx) => {
          const ans = answers.find((a) => a.questionId === q.id);
          const isAnswered = ans?.answer !== null;
          const isFlagged = ans?.flagged;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(idx)}
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium transition-all relative",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered
                  ? "bg-success/20 text-success border border-success"
                  : "bg-muted text-muted-foreground border border-transparent",
                !isAnswered && !isCurrent && "hover:bg-muted/80"
              )}
            >
              {idx + 1}
              {isFlagged && (
                <Flag className="h-3 w-3 absolute -top-1 -right-1 text-warning fill-warning" />
              )}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{currentQuestion.points} pts</Badge>
              <Badge variant="secondary" className="capitalize">
                {currentQuestion.question_type.replace("_", " ")}
              </Badge>
            </div>
            <CardTitle className="text-lg font-medium whitespace-pre-wrap">
              {currentQuestion.question_text}
            </CardTitle>
          </div>
          <Button
            variant={currentAnswer?.flagged ? "warning" : "ghost"}
            size="sm"
            onClick={() => toggleFlag(currentQuestion.id)}
          >
            <Flag className={cn("h-4 w-4", currentAnswer?.flagged && "fill-current")} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multiple Choice Options */}
          {(currentQuestion.question_type === "multiple_choice" ||
            currentQuestion.question_type === "true_false") && (
            <div className="space-y-3">
              {(currentQuestion.options || []).map((option, optionIndex) => {
                const isSelected = currentAnswer?.answer === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    onClick={() => updateAnswer(currentQuestion.id, optionIndex)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-muted"
                      )}
                    >
                      {isSelected && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer */}
          {currentQuestion.question_type === "short_answer" && (
            <textarea
              className="w-full p-4 border rounded-lg min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type your answer here..."
              value={(currentAnswer?.answer as string) || ""}
              onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentIndex < orderedQuestions.length - 1 ? (
            <Button onClick={() => goToQuestion(currentIndex + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>Submit Quiz?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Questions Answered</span>
                  <span className="font-medium">
                    {answeredCount} / {orderedQuestions.length}
                  </span>
                </div>
                {answeredCount < orderedQuestions.length && (
                  <Alert variant="warning">
                    You have {orderedQuestions.length - answeredCount} unanswered question(s).
                  </Alert>
                )}
                {flaggedCount > 0 && (
                  <Alert variant="info">
                    You have {flaggedCount} flagged question(s) for review.
                  </Alert>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmSubmit(false)}
                  disabled={isSubmitting}
                >
                  Review Answers
                </Button>
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Quiz Results Display Component
interface QuizResultsProps {
  questions: (QuizQuestionData & { correct_answer: number | string })[];
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  showCorrectAnswers?: boolean;
}

export function QuizResults({
  questions,
  answers,
  score,
  maxScore,
  showCorrectAnswers = true,
}: QuizResultsProps) {
  const percentage = Math.round((score / maxScore) * 100);

  const getGradeColor = (pct: number) => {
    if (pct >= 90) return "text-success";
    if (pct >= 80) return "text-info";
    if (pct >= 70) return "text-warning";
    return "text-error";
  };

  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className={cn("text-6xl font-bold mb-2", getGradeColor(percentage))}>
            {percentage}%
          </div>
          <p className="text-lg text-muted-foreground">
            {score} out of {maxScore} points
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Badge variant="success">
              {answers.filter((a, i) => {
                const q = questions.find((q) => q.id === a.questionId);
                return q && a.answer === q.correct_answer;
              }).length} Correct
            </Badge>
            <Badge variant="destructive">
              {answers.filter((a, i) => {
                const q = questions.find((q) => q.id === a.questionId);
                return q && a.answer !== q.correct_answer && a.answer !== null;
              }).length} Incorrect
            </Badge>
            <Badge variant="secondary">
              {answers.filter((a) => a.answer === null).length} Unanswered
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      {showCorrectAnswers && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Question Review</h3>
          {questions.map((question, index) => {
            const answer = answers.find((a) => a.questionId === question.id);
            const isCorrect = answer?.answer === question.correct_answer;
            const wasAnswered = answer?.answer !== null;

            return (
              <Card
                key={question.id}
                className={cn(
                  "border-l-4",
                  isCorrect && wasAnswered && "border-l-success",
                  !isCorrect && wasAnswered && "border-l-error",
                  !wasAnswered && "border-l-muted"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCorrect && wasAnswered ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : wasAnswered ? (
                        <AlertTriangle className="h-5 w-5 text-error" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {question.question_text}
                      </p>

                      {(question.question_type === "multiple_choice" ||
                        question.question_type === "true_false") && (
                        <div className="space-y-1">
                          {(question.options || []).map((option, optIdx) => {
                            const isSelectedAnswer = answer?.answer === optIdx;
                            const isCorrectAnswer = question.correct_answer === optIdx;

                            return (
                              <div
                                key={optIdx}
                                className={cn(
                                  "p-2 rounded text-sm",
                                  isCorrectAnswer && "bg-success/20 text-success font-medium",
                                  isSelectedAnswer && !isCorrectAnswer && "bg-error/20 text-error"
                                )}
                              >
                                {isCorrectAnswer && <CheckCircle className="h-3 w-3 inline mr-1" />}
                                {option}
                                {isSelectedAnswer && !isCorrectAnswer && " (Your answer)"}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.question_type === "short_answer" && (
                        <div className="space-y-1 text-sm">
                          <div className="p-2 rounded bg-muted">
                            <span className="text-muted-foreground">Your answer: </span>
                            {(answer?.answer as string) || "(No answer)"}
                          </div>
                          <div className="p-2 rounded bg-success/20 text-success">
                            <span className="font-medium">Correct answer: </span>
                            {question.correct_answer as string}
                          </div>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Utility function to auto-grade a quiz
export function autoGradeQuiz(
  questions: (QuizQuestionData & { correct_answer: number | string })[],
  answers: QuizAnswer[]
): { score: number; maxScore: number; results: { questionId: string; correct: boolean; points: number }[] } {
  let score = 0;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const results: { questionId: string; correct: boolean; points: number }[] = [];

  for (const question of questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    let isCorrect = false;

    if (answer && answer.answer !== null) {
      if (question.question_type === "short_answer") {
        // Case-insensitive comparison for short answer
        const studentAnswer = String(answer.answer).trim().toLowerCase();
        const correctAnswer = String(question.correct_answer).trim().toLowerCase();
        isCorrect = studentAnswer === correctAnswer;
      } else {
        // Exact match for multiple choice / true-false
        isCorrect = answer.answer === question.correct_answer;
      }
    }

    if (isCorrect) {
      score += question.points;
    }

    results.push({
      questionId: question.id,
      correct: isCorrect,
      points: isCorrect ? question.points : 0,
    });
  }

  return { score, maxScore, results };
}

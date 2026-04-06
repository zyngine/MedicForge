"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  CheckCircle,
  XCircle,
  Target,
  Brain,
  Award,
  BarChart3,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useExamResult, type ExamResponse } from "@/lib/hooks/use-standardized-exams";

interface Props {
  params: { attemptId: string };
}

export default function ExamResultsPage({ params }: Props) {
  const { result, responses, isLoading } = useExamResult(params.attemptId);
  const [showAnswers, setShowAnswers] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">
          <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-6">
            The results for this exam are not yet available or the exam was not completed.
          </p>
          <Button asChild>
            <Link href="/student/exams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exams
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const correctCount = responses.filter((r) => r.is_correct).length;
  const totalQuestions = responses.length;
  const incorrectCount = totalQuestions - correctCount;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/student/exams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Link>
        </Button>
      </div>

      {/* Result Summary */}
      <Card className={`border-2 ${result.passed ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}>
        <CardContent className="p-8">
          <div className="text-center mb-8">
            {result.passed ? (
              <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Award className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">
              {result.passed ? "Congratulations! You Passed!" : "Keep Practicing!"}
            </h1>
            <p className="text-muted-foreground">
              {result.passed
                ? "You have successfully completed this exam."
                : "You didn't pass this time, but don't give up!"}
            </p>
          </div>

          {/* Score Display */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Your Score</p>
              <p className={`text-5xl font-bold ${result.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {result.percentage_score.toFixed(0)}%
              </p>
            </div>
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Questions Correct</p>
              <p className="text-5xl font-bold">
                {correctCount}<span className="text-2xl text-muted-foreground">/{totalQuestions}</span>
              </p>
            </div>
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Time Spent</p>
              <p className="text-5xl font-bold">{formatTime(result.time_spent_seconds)}</p>
            </div>
          </div>

          {/* Scaled Score (for CAT) */}
          {result.scaled_score !== null && (
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-900 dark:text-purple-100">Adaptive Test Score</span>
              </div>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {result.scaled_score}
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Scaled score based on question difficulty
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Correct: {correctCount}
              </span>
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Incorrect: {incorrectCount}
              </span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(correctCount / totalQuestions) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(incorrectCount / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {result.category_scores && Object.keys(result.category_scores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(result.category_scores).map(([category, scores]) => (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{category}</span>
                    <span className="text-sm text-muted-foreground">
                      {scores.correct}/{scores.total} ({scores.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress
                    value={scores.percentage}
                    className={`h-2 ${scores.percentage >= 70 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer Review */}
      <Card>
        <CardHeader>
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowAnswers(!showAnswers)}
          >
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Review Answers
            </CardTitle>
            {showAnswers ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </CardHeader>
        {showAnswers && (
          <CardContent>
            <div className="space-y-4">
              {responses.map((response, index) => (
                <AnswerReviewItem
                  key={response.id}
                  response={response}
                  questionNumber={index + 1}
                />
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/student/exams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Link>
        </Button>
        <Button asChild>
          <Link href="/student/exams">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface AnswerReviewItemProps {
  response: ExamResponse;
  questionNumber: number;
}

function AnswerReviewItem({ response, questionNumber }: AnswerReviewItemProps) {
  const question = response.question;
  const [expanded, setExpanded] = React.useState(false);

  if (!question) return null;

  return (
    <div className={`p-4 rounded-lg border ${response.is_correct ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"}`}>
      <button
        className="flex items-start justify-between w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {response.is_correct ? (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">Question {questionNumber}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {question.question_text}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <p className="text-sm">{question.question_text}</p>

          {question.options && (
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const isCorrect = option.isCorrect;
                const wasSelected =
                  (response.response as { id?: string; index?: number })?.id === option.id ||
                  (response.response as { index?: number })?.index === idx;

                return (
                  <div
                    key={option.id || idx}
                    className={`p-2 rounded text-sm ${
                      isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        : wasSelected
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCorrect && <CheckCircle className="h-4 w-4" />}
                      {wasSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                      <span>{option.text}</span>
                      {wasSelected && <Badge variant="outline" className="ml-auto">Your answer</Badge>}
                      {isCorrect && <Badge variant="success" className="ml-auto">Correct</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {question.explanation && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Explanation</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

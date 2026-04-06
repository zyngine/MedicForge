"use client";

import * as React from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  BarChart3,
  User,
  ChevronDown,
  ChevronRight,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { formatDate, formatDuration } from "@/lib/utils";

interface AttemptDetails {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "abandoned";
  current_theta: number | null;
  questions_answered: number;
  score: number | null;
  passed: boolean | null;
  time_spent_seconds: number | null;
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
  exam?: {
    id: string;
    title: string;
    template?: {
      name: string;
      exam_type: "standard" | "cat";
      passing_score: number;
      certification_level: string;
    };
  };
}

interface ExamResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;
  is_correct: boolean;
  time_spent_seconds: number | null;
  question?: {
    id: string;
    question_text: string;
    options: Array<{ id: string; text: string; isCorrect?: boolean }>;
    explanation: string | null;
    category: string | null;
    difficulty: string | null;
  };
}

export default function InstructorExamResultsPage() {
  const params = useParams();
  const examId = params.examId as string;
  const attemptId = params.attemptId as string;
  const { profile } = useUser();

  const [attempt, setAttempt] = React.useState<AttemptDetails | null>(null);
  const [responses, setResponses] = React.useState<ExamResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showAnswers, setShowAnswers] = React.useState(false);

  const supabase = createClient();

  React.useEffect(() => {
    if (!attemptId || !profile?.tenant_id) return;

    const fetchAttemptDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch attempt with student and exam info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attemptData, error: attemptError } = await (supabase as any)
          .from("exam_attempts")
          .select(`
            *,
            student:users(id, full_name, email),
            exam:standardized_exams(
              id,
              title,
              template:standardized_exam_templates(
                name,
                exam_type,
                passing_score,
                certification_level
              )
            )
          `)
          .eq("id", attemptId)
          .single();

        if (attemptError) throw attemptError;
        setAttempt(attemptData);

        // Fetch responses with questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: responsesData, error: responsesError } = await (supabase as any)
          .from("exam_responses")
          .select(`
            *,
            question:question_bank(
              id,
              question_text,
              options,
              explanation,
              category,
              difficulty
            )
          `)
          .eq("attempt_id", attemptId)
          .order("created_at", { ascending: true });

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);
      } catch (err) {
        console.error("Failed to fetch attempt details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttemptDetails();
  }, [attemptId, profile?.tenant_id, supabase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Attempt not found</h3>
        <p className="text-muted-foreground mb-4">This exam attempt may have been deleted.</p>
        <Button asChild>
          <Link href={`/instructor/exams/${examId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam
          </Link>
        </Button>
      </div>
    );
  }

  const correctCount = responses.filter((r) => r.is_correct).length;
  const totalQuestions = responses.length;
  const incorrectCount = totalQuestions - correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Calculate category breakdown
  const categoryStats: Record<string, { correct: number; total: number }> = {};
  responses.forEach((r) => {
    const category = r.question?.category || "Uncategorized";
    if (!categoryStats[category]) {
      categoryStats[category] = { correct: 0, total: 0 };
    }
    categoryStats[category].total++;
    if (r.is_correct) {
      categoryStats[category].correct++;
    }
  });

  const template = attempt.exam?.template;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/instructor/exams/${examId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam
          </Link>
        </Button>
      </div>

      {/* Student & Exam Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-full">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{attempt.student?.full_name || "Unknown Student"}</h1>
                <p className="text-muted-foreground">{attempt.student?.email}</p>
              </div>
            </div>
            <Badge
              variant={attempt.passed ? "success" : "destructive"}
              className="text-base px-4 py-1"
            >
              {attempt.passed ? "PASSED" : "FAILED"}
            </Badge>
          </div>

          <div className="grid md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Exam</p>
              <p className="font-medium">{attempt.exam?.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium flex items-center gap-1">
                {template?.exam_type === "cat" ? (
                  <>
                    <Brain className="h-4 w-4" />
                    Adaptive (CAT)
                  </>
                ) : (
                  "Standard"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">{formatDate(attempt.started_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {attempt.time_spent_seconds
                  ? formatDuration(attempt.time_spent_seconds)
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <Card className={`border-2 ${attempt.passed ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Score</p>
              <p className={`text-5xl font-bold ${attempt.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {attempt.score?.toFixed(0) || percentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Passing: {template?.passing_score || 70}%
              </p>
            </div>
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Questions Correct</p>
              <p className="text-5xl font-bold">
                {correctCount}<span className="text-2xl text-muted-foreground">/{totalQuestions}</span>
              </p>
            </div>
            <div className="text-center p-6 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Certification Level</p>
              <p className="text-3xl font-bold">{template?.certification_level || "N/A"}</p>
            </div>
          </div>

          {/* CAT Scaled Score */}
          {template?.exam_type === "cat" && attempt.current_theta !== null && (
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-900 dark:text-purple-100">Ability Estimate (Theta)</span>
              </div>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {attempt.current_theta.toFixed(2)}
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Final ability estimate based on IRT model
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
      {Object.keys(categoryStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats).map(([category, stats]) => {
                const categoryPercent = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={category}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.correct}/{stats.total} ({categoryPercent}%)
                      </span>
                    </div>
                    <Progress
                      value={categoryPercent}
                      className={`h-2 ${categoryPercent >= 70 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
                    />
                  </div>
                );
              })}
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
              Review All Answers ({responses.length})
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
            <div className="flex items-center gap-2">
              <p className="font-medium">Question {questionNumber}</p>
              {question.category && (
                <Badge variant="outline" className="text-xs">{question.category}</Badge>
              )}
              {question.difficulty && (
                <Badge variant="secondary" className="text-xs capitalize">{question.difficulty}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {question.question_text}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {response.time_spent_seconds && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {response.time_spent_seconds}s
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          )}
        </div>
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
                      {wasSelected && <Badge variant="outline" className="ml-auto">Student&apos;s answer</Badge>}
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

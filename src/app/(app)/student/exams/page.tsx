"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
} from "@/components/ui";
import {
  ClipboardList,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Brain,
  Target,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  useAvailableExams,
  useMyExamAttempts,
  type StandardizedExam,
  type ExamAttempt,
} from "@/lib/hooks/use-standardized-exams";
import { formatDate } from "@/lib/utils";

export default function StudentExamsPage() {
  const { exams, isLoading: examsLoading } = useAvailableExams();
  const { attempts, isLoading: attemptsLoading } = useMyExamAttempts();
  const [activeTab, setActiveTab] = React.useState("available");

  const isLoading = examsLoading || attemptsLoading;

  // Group attempts by status
  const completedAttempts = attempts.filter((a) => a.status === "completed");
  const inProgressAttempts = attempts.filter((a) => a.status === "in_progress");

  // Calculate stats
  const _passedCount = completedAttempts.filter((a) => {
    const result = a.result?.[0];
    return result?.passed === true;
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Standardized Exams</h1>
        <p className="text-muted-foreground">
          Take practice and certification exams to test your knowledge.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressAttempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedAttempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{attempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Warning */}
      {inProgressAttempts.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  You have {inProgressAttempts.length} exam(s) in progress
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Continue where you left off to avoid losing your progress.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/student/exams/${inProgressAttempts[0].id}/take`}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="available" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">
            Available Exams ({exams.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Exam History ({attempts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {exams.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Exams Available</h3>
                <p className="text-muted-foreground">
                  There are no exams available for you to take at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <AvailableExamCard key={exam.id} exam={exam} attempts={attempts} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {attempts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Exam History</h3>
                <p className="text-muted-foreground">
                  You haven&apos;t taken any exams yet. Start with an available exam!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <AttemptHistoryCard key={attempt.id} attempt={attempt} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AvailableExamCardProps {
  exam: StandardizedExam;
  attempts: ExamAttempt[];
}

function AvailableExamCard({ exam, attempts }: AvailableExamCardProps) {
  const template = exam.template;
  const examAttempts = attempts.filter((a) => a.template_id === exam.template_id);
  const hasInProgress = examAttempts.some((a) => a.status === "in_progress");
  const attemptsUsed = examAttempts.length;
  const maxAttempts = template?.max_attempts;
  const canTakeExam = !maxAttempts || attemptsUsed < maxAttempts;

  const isCAT = template?.exam_type === "cat";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 rounded-lg ${isCAT ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
            {isCAT ? (
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          {template?.certification_level && (
            <Badge variant="secondary">{template.certification_level}</Badge>
          )}
        </div>

        {/* Exam Info */}
        <h3 className="font-semibold text-lg mb-2">{exam.title}</h3>
        {exam.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {exam.description}
          </p>
        )}

        {/* Details */}
        {template && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span>
                {isCAT
                  ? `${template.cat_config?.min_questions}-${template.cat_config?.max_questions} Q`
                  : `${template.total_questions} Q`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{template.time_limit_minutes ? `${template.time_limit_minutes} min` : "No limit"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>{template.passing_score}% to pass</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {attemptsUsed}/{maxAttempts || "∞"} attempts
              </span>
            </div>
          </div>
        )}

        {/* Availability */}
        {(exam.available_from || exam.available_until) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Calendar className="h-3 w-3" />
            <span>
              {exam.available_from && `From ${formatDate(exam.available_from)}`}
              {exam.available_until && ` until ${formatDate(exam.available_until)}`}
            </span>
          </div>
        )}

        {/* Action */}
        <div className="pt-4 border-t">
          {hasInProgress ? (
            <Button className="w-full" asChild>
              <Link href={`/student/exams/${examAttempts.find((a) => a.status === "in_progress")?.id}/take`}>
                <Play className="h-4 w-4 mr-2" />
                Continue Exam
              </Link>
            </Button>
          ) : canTakeExam ? (
            <Button className="w-full" asChild>
              <Link href={`/student/exams/start/${exam.template_id}`}>
                <Play className="h-4 w-4 mr-2" />
                Start Exam
              </Link>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              <XCircle className="h-4 w-4 mr-2" />
              No Attempts Remaining
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AttemptHistoryCardProps {
  attempt: ExamAttempt;
}

function AttemptHistoryCard({ attempt }: AttemptHistoryCardProps) {
  const template = attempt.template;
  const _isCAT = template?.exam_type === "cat";

  const statusIcon = {
    in_progress: <Clock className="h-5 w-5 text-yellow-500" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    abandoned: <XCircle className="h-5 w-5 text-red-500" />,
    timed_out: <AlertCircle className="h-5 w-5 text-orange-500" />,
  };

  const statusLabel = {
    in_progress: "In Progress",
    completed: "Completed",
    abandoned: "Abandoned",
    timed_out: "Timed Out",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {statusIcon[attempt.status]}
            <div>
              <h4 className="font-medium">{template?.name || "Unknown Exam"}</h4>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Attempt #{attempt.attempt_number}</span>
                <span>•</span>
                <span>{formatDate(attempt.started_at)}</span>
                {attempt.questions_answered > 0 && (
                  <>
                    <span>•</span>
                    <span>{attempt.questions_answered} questions answered</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={attempt.status === "completed" ? "success" : attempt.status === "in_progress" ? "warning" : "default"}>
              {statusLabel[attempt.status]}
            </Badge>

            {attempt.status === "in_progress" ? (
              <Button size="sm" asChild>
                <Link href={`/student/exams/${attempt.id}/take`}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/student/exams/${attempt.id}/results`}>
                  View Results
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

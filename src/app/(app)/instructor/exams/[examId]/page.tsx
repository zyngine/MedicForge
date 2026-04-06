"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Spinner,
  Input,
} from "@/components/ui";
import {
  ArrowLeft,
  ClipboardList,
  Users,
  Brain,
  Calendar,
  Play,
  Pause,
  Search,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  Award,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDuration } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";

interface ExamAttempt {
  id: string;
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
}

interface ExamDetails {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  template: {
    id: string;
    name: string;
    exam_type: "standard" | "cat";
    certification_level: string;
    total_questions: number;
    time_limit_minutes: number | null;
    passing_score: number;
    cat_min_questions: number | null;
    cat_max_questions: number | null;
  } | null;
}

const examTypeLabels: Record<string, string> = {
  standard: "Standard",
  cat: "Adaptive (CAT)",
};

const certificationColors: Record<string, string> = {
  EMR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  EMT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  AEMT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Paramedic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function InstructorExamDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const examId = params.examId as string;
  const { profile } = useUser();

  const [exam, setExam] = React.useState<ExamDetails | null>(null);
  const [attempts, setAttempts] = React.useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const supabase = createClient();

  React.useEffect(() => {
    if (!examId || !profile?.tenant_id) return;

    const fetchExamDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch exam with template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: examData, error: examError } = await (supabase as any)
          .from("standardized_exams")
          .select(`
            *,
            template:standardized_exam_templates(*)
          `)
          .eq("id", examId)
          .eq("tenant_id", profile.tenant_id)
          .single();

        if (examError) throw examError;
        setExam(examData);

        // Fetch attempts with student info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attemptsData, error: attemptsError } = await (supabase as any)
          .from("exam_attempts")
          .select(`
            *,
            student:users(id, full_name, email)
          `)
          .eq("exam_id", examId)
          .order("started_at", { ascending: false });

        if (attemptsError) throw attemptsError;
        setAttempts(attemptsData || []);
      } catch (err) {
        console.error("Failed to fetch exam details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId, profile?.tenant_id, supabase]);

  const handleTogglePublish = async () => {
    if (!exam) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("standardized_exams")
        .update({ is_published: !exam.is_published })
        .eq("id", exam.id);

      if (error) throw error;
      setExam({ ...exam, is_published: !exam.is_published });
    } catch (err) {
      console.error("Failed to update exam:", err);
    }
  };

  const filteredAttempts = attempts.filter((attempt) => {
    const matchesSearch =
      attempt.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.student?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || attempt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const completed = attempts.filter((a) => a.status === "completed");
    const passed = completed.filter((a) => a.passed);
    const avgScore = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length
      : 0;
    const avgTime = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / completed.length
      : 0;

    return {
      totalAttempts: attempts.length,
      completed: completed.length,
      inProgress: attempts.filter((a) => a.status === "in_progress").length,
      passRate: completed.length > 0 ? (passed.length / completed.length) * 100 : 0,
      avgScore,
      avgTime,
    };
  }, [attempts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Exam not found</h3>
        <p className="text-muted-foreground mb-4">This exam may have been deleted.</p>
        <Button asChild>
          <Link href="/instructor/exams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Link>
        </Button>
      </div>
    );
  }

  const template = exam.template;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/instructor/exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <Badge variant={exam.is_published ? "success" : "secondary"}>
                {exam.is_published ? "Published" : "Draft"}
              </Badge>
              {template?.certification_level && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${certificationColors[template.certification_level]}`}>
                  {template.certification_level}
                </span>
              )}
            </div>
            {exam.description && (
              <p className="text-muted-foreground">{exam.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={exam.is_published ? "secondary" : "default"}
            onClick={handleTogglePublish}
          >
            {exam.is_published ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Exam Details & Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${template?.exam_type === "cat" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                {template?.exam_type === "cat" ? (
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exam Type</p>
                <p className="font-semibold">{template ? examTypeLabels[template.exam_type] : "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="font-semibold">{stats.totalAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="font-semibold">{stats.passRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="font-semibold">{stats.avgScore.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Configuration */}
      {template && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Configuration</CardTitle>
            <CardDescription>Template: {template.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Questions</p>
                <p className="font-medium">
                  {template.exam_type === "cat"
                    ? `${template.cat_min_questions}-${template.cat_max_questions}`
                    : template.total_questions}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time Limit</p>
                <p className="font-medium">
                  {template.time_limit_minutes ? `${template.time_limit_minutes} min` : "No limit"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Passing Score</p>
                <p className="font-medium">{template.passing_score}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Certification</p>
                <p className="font-medium">{template.certification_level}</p>
              </div>
            </div>
            {(exam.available_from || exam.available_until) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Availability Window</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {exam.available_from ? formatDate(exam.available_from) : "Any time"}
                  {" - "}
                  {exam.available_until ? formatDate(exam.available_until) : "No end date"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Attempts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Attempts</CardTitle>
              <CardDescription>
                {stats.completed} completed, {stats.inProgress} in progress
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-sm"
            />
            <select
              className="px-3 py-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          {/* Attempts Table */}
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Score</th>
                    <th className="text-left py-3 px-4 font-medium">Questions</th>
                    <th className="text-left py-3 px-4 font-medium">Time</th>
                    <th className="text-left py-3 px-4 font-medium">Started</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{attempt.student?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{attempt.student?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {attempt.status === "completed" ? (
                          attempt.passed ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )
                        ) : attempt.status === "in_progress" ? (
                          <Badge variant="warning" className="gap-1">
                            <Timer className="h-3 w-3" />
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Abandoned</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {attempt.score !== null ? `${attempt.score.toFixed(1)}%` : "-"}
                      </td>
                      <td className="py-3 px-4">{attempt.questions_answered}</td>
                      <td className="py-3 px-4">
                        {attempt.time_spent_seconds
                          ? formatDuration(attempt.time_spent_seconds)
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(attempt.started_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {attempt.status === "completed" && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/instructor/exams/${examId}/results/${attempt.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

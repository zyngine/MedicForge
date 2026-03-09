"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Spinner,
  Modal,
  ModalFooter,
  Input,
  Label,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  TrendingDown,
  Calculator,
  Ban,
  Undo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuizResults, QuestionAnalytics } from "@/lib/hooks/use-quiz-results";
import { cn } from "@/lib/utils";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "primary" | "success" | "warning" | "error";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  analytics,
  index,
  onExclude,
  onInclude,
  isExpanded,
  onToggleExpand,
}: {
  analytics: QuestionAnalytics;
  index: number;
  onExclude: (id: string, reason?: string) => void;
  onInclude: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { question, percentCorrect, correctCount, totalResponses, answerDistribution } = analytics;
  const [showExcludeModal, setShowExcludeModal] = React.useState(false);
  const [excludeReason, setExcludeReason] = React.useState("");

  const performanceColor =
    percentCorrect >= 70 ? "success" :
    percentCorrect >= 50 ? "warning" : "error";

  const performanceColorClass = {
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  }[performanceColor];

  const handleExclude = () => {
    onExclude(question.id, excludeReason);
    setShowExcludeModal(false);
    setExcludeReason("");
  };

  return (
    <>
      <Card className={cn(question.is_excluded && "opacity-60 border-dashed")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Question number */}
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0",
              question.is_excluded
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {index + 1}
            </div>

            {/* Question content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className={cn("font-medium", question.is_excluded && "line-through")}>
                    {question.question_text}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <Badge variant="outline">
                      {question.question_type === "multiple_choice" ? "Multiple Choice" :
                       question.question_type === "true_false" ? "True/False" : "Short Answer"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {question.points} point{question.points !== 1 ? "s" : ""}
                    </span>
                    {question.is_excluded && (
                      <Badge variant="secondary" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Excluded
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Performance indicator */}
                <div className="text-right shrink-0">
                  <p className={cn("text-2xl font-bold", performanceColorClass)}>
                    {percentCorrect}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {correctCount}/{totalResponses} correct
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <Progress
                  value={percentCorrect}
                  className={cn("h-2", question.is_excluded && "opacity-50")}
                />
              </div>

              {/* Expand/collapse button */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-center"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Answer Distribution
                  </>
                )}
              </Button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Correct answer */}
                  <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                    <p className="text-sm font-medium text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Correct Answer
                    </p>
                    <p className="mt-1">
                      {question.options && typeof question.correct_answer === "number"
                        ? question.options[question.correct_answer]
                        : String(question.correct_answer)}
                    </p>
                  </div>

                  {/* Answer distribution */}
                  {answerDistribution.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Response Distribution</p>
                      <div className="space-y-2">
                        {answerDistribution.map((dist, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded",
                              dist.isCorrect ? "bg-success/10" : "bg-muted"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {dist.isCorrect && (
                                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                                )}
                                <span className={cn(
                                  "text-sm truncate",
                                  dist.isCorrect && "font-medium"
                                )}>
                                  {question.options && !isNaN(Number(dist.option))
                                    ? question.options[Number(dist.option)]
                                    : dist.option}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Progress
                                value={dist.percentage}
                                className="w-20 h-2"
                              />
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {dist.count} ({dist.percentage}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation if available */}
                  {question.explanation && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Explanation</p>
                      <p className="text-sm text-muted-foreground">{question.explanation}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    {question.is_excluded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onInclude(question.id)}
                      >
                        <Undo className="h-4 w-4 mr-2" />
                        Include Question
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setShowExcludeModal(true)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Exclude Question
                      </Button>
                    )}
                  </div>

                  {/* Exclusion reason if excluded */}
                  {question.is_excluded && question.exclusion_reason && (
                    <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <p className="text-sm font-medium text-warning">Exclusion Reason</p>
                      <p className="text-sm mt-1">{question.exclusion_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exclude Modal */}
      <Modal
        isOpen={showExcludeModal}
        onClose={() => setShowExcludeModal(false)}
        title="Exclude Question from Scoring"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Excluding this question will remove it from score calculations.
              You'll need to recalculate scores after excluding.
            </span>
          </Alert>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Question {index + 1}</p>
            <p className="text-sm text-muted-foreground mt-1">{question.question_text}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Exclusion (Optional)</Label>
            <Input
              id="reason"
              value={excludeReason}
              onChange={(e) => setExcludeReason(e.target.value)}
              placeholder="e.g., Ambiguous wording, incorrect answer key"
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowExcludeModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExclude}>
              <Ban className="h-4 w-4 mr-2" />
              Exclude Question
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}

export default function QuizResultsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;

  const {
    questions,
    analytics,
    stats,
    isLoading,
    isRecalculating,
    questionsByDifficulty,
    problematicQuestions,
    excludeQuestion,
    includeQuestion,
    recalculateScores,
    refetch,
  } = useQuizResults(assignmentId);

  const [expandedQuestions, setExpandedQuestions] = React.useState<Set<string>>(new Set());
  const [showRecalculateModal, setShowRecalculateModal] = React.useState(false);

  const toggleExpand = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map((q) => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const handleRecalculate = async () => {
    const count = await recalculateScores();
    setShowRecalculateModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/instructor/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quiz Results Analysis</h1>
          <p className="text-muted-foreground">
            Item analysis and performance breakdown
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {stats && stats.excludedQuestions > 0 && (
            <Button onClick={() => setShowRecalculateModal(true)}>
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate Scores
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Submissions"
            value={stats.totalSubmissions}
            icon={Users}
            color="primary"
          />
          <StatCard
            title="Average Score"
            value={`${stats.averageScore}/${stats.activePointsPossible}`}
            subtitle={`${Math.round((stats.averageScore / stats.activePointsPossible) * 100)}%`}
            icon={BarChart3}
            color="primary"
          />
          <StatCard
            title="Score Range"
            value={`${stats.lowestScore} - ${stats.highestScore}`}
            subtitle={`Median: ${stats.medianScore}`}
            icon={TrendingUp}
            color="success"
          />
          <StatCard
            title="Questions"
            value={`${stats.totalActiveQuestions}/${stats.totalQuestions}`}
            subtitle={stats.excludedQuestions > 0 ? `${stats.excludedQuestions} excluded` : "None excluded"}
            icon={stats.excludedQuestions > 0 ? AlertTriangle : CheckCircle}
            color={stats.excludedQuestions > 0 ? "warning" : "success"}
          />
        </div>
      )}

      {/* Problematic Questions Alert */}
      {problematicQuestions.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <p className="font-medium">
              {problematicQuestions.length} question{problematicQuestions.length !== 1 ? "s" : ""} with less than 50% correct
            </p>
            <p className="text-sm">
              Consider reviewing these questions for clarity or excluding them from scoring.
            </p>
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="difficulty">
              By Difficulty
            </TabsTrigger>
            {problematicQuestions.length > 0 && (
              <TabsTrigger value="problematic">
                Needs Review ({problematicQuestions.length})
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              <Eye className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              <EyeOff className="h-4 w-4 mr-1" />
              Collapse All
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-6 space-y-4">
          {analytics.map((a, index) => (
            <QuestionCard
              key={a.question.id}
              analytics={a}
              index={index}
              onExclude={excludeQuestion}
              onInclude={includeQuestion}
              isExpanded={expandedQuestions.has(a.question.id)}
              onToggleExpand={() => toggleExpand(a.question.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="difficulty" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Questions sorted by difficulty (hardest first)
          </p>
          {questionsByDifficulty.map((a) => {
            const originalIndex = analytics.findIndex((x) => x.question.id === a.question.id);
            return (
              <QuestionCard
                key={a.question.id}
                analytics={a}
                index={originalIndex}
                onExclude={excludeQuestion}
                onInclude={includeQuestion}
                isExpanded={expandedQuestions.has(a.question.id)}
                onToggleExpand={() => toggleExpand(a.question.id)}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="problematic" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Questions where less than 50% of students answered correctly
          </p>
          {problematicQuestions.map((a) => {
            const originalIndex = analytics.findIndex((x) => x.question.id === a.question.id);
            return (
              <QuestionCard
                key={a.question.id}
                analytics={a}
                index={originalIndex}
                onExclude={excludeQuestion}
                onInclude={includeQuestion}
                isExpanded={expandedQuestions.has(a.question.id)}
                onToggleExpand={() => toggleExpand(a.question.id)}
              />
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Recalculate Modal */}
      <Modal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
        title="Recalculate All Scores"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <Calculator className="h-4 w-4" />
            <span>
              This will recalculate scores for all {stats?.totalSubmissions} submissions,
              excluding {stats?.excludedQuestions} question{stats?.excludedQuestions !== 1 ? "s" : ""}.
            </span>
          </Alert>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Original Points Possible:</span>
              <span className="font-medium">{stats?.totalPointsPossible}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>New Points Possible:</span>
              <span className="font-medium text-primary">{stats?.activePointsPossible}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Student scores will be updated based on only the active questions.
            This action can be reversed by including the excluded questions and recalculating again.
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowRecalculateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecalculate} disabled={isRecalculating}>
              {isRecalculating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Recalculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Recalculate Scores
                </>
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

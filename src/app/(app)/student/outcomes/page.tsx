"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Spinner,
  Progress,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  BookOpen,
  GraduationCap,
  Building2,
  Award,
} from "lucide-react";
import { useStudentMastery, useLearningOutcomes, type LearningOutcome } from "@/lib/hooks/use-outcomes";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { formatDate } from "@/lib/utils";

export default function StudentOutcomesPage() {
  const { data: enrollments = [] } = useMyEnrollments();
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");

  const {
    mastery,
    masteredOutcomes,
    inProgressOutcomes,
    notStartedOutcomes,
    overallMasteryRate,
    isLoading,
    recalculateAllMastery,
  } = useStudentMastery(undefined, selectedCourse || undefined);

  const { outcomes: allOutcomes } = useLearningOutcomes(selectedCourse || undefined);

  const [isRecalculating, setIsRecalculating] = React.useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await recalculateAllMastery();
    setIsRecalculating(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen className="h-4 w-4" />;
      case "program":
        return <GraduationCap className="h-4 w-4" />;
      case "institutional":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getMasteryStatusBadge = (achieved: boolean, score: number | null) => {
    if (achieved) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Mastered
        </Badge>
      );
    }
    if (score && score > 0) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Not Started
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Learning Outcomes
          </h1>
          <p className="text-muted-foreground">
            Track your mastery of course and program learning outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCourse}
            onChange={setSelectedCourse}
            options={[
              { value: "", label: "All Courses" },
              ...enrollments.map((enrollment) => ({
                value: enrollment.course_id,
                label: enrollment.course?.title || "Course",
              })),
            ]}
            placeholder="All Courses"
            className="w-[200px]"
          />
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Overall Mastery</h3>
              <p className="text-sm text-muted-foreground">
                Your progress across all learning outcomes
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{overallMasteryRate.toFixed(0)}%</div>
              <p className="text-sm text-muted-foreground">
                {masteredOutcomes.length} of {mastery.length} mastered
              </p>
            </div>
          </div>
          <Progress value={overallMasteryRate} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{masteredOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inProgressOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{notStartedOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Outcomes ({mastery.length})</TabsTrigger>
          <TabsTrigger value="mastered">Mastered ({masteredOutcomes.length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({inProgressOutcomes.length})</TabsTrigger>
          <TabsTrigger value="notstarted">Not Started ({notStartedOutcomes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <OutcomesList
            items={mastery}
            getTypeIcon={getTypeIcon}
            getMasteryStatusBadge={getMasteryStatusBadge}
          />
        </TabsContent>

        <TabsContent value="mastered">
          <OutcomesList
            items={masteredOutcomes}
            getTypeIcon={getTypeIcon}
            getMasteryStatusBadge={getMasteryStatusBadge}
          />
        </TabsContent>

        <TabsContent value="progress">
          <OutcomesList
            items={inProgressOutcomes}
            getTypeIcon={getTypeIcon}
            getMasteryStatusBadge={getMasteryStatusBadge}
          />
        </TabsContent>

        <TabsContent value="notstarted">
          {notStartedOutcomes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-medium mb-2">Great progress!</h3>
                <p className="text-muted-foreground">
                  You've started working on all your learning outcomes
                </p>
              </CardContent>
            </Card>
          ) : (
            <OutcomesList
              items={notStartedOutcomes}
              getTypeIcon={getTypeIcon}
              getMasteryStatusBadge={getMasteryStatusBadge}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* All Available Outcomes (not yet tracked) */}
      {allOutcomes.length > mastery.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Available Outcomes ({allOutcomes.length - mastery.length} not yet tracked)
            </CardTitle>
            <CardDescription>
              These outcomes will be tracked as you complete related assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allOutcomes
                .filter((o) => !mastery.some((m) => m.outcome_id === o.id))
                .slice(0, 5)
                .map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="p-2 rounded-lg bg-background">
                      {getTypeIcon(outcome.outcome_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {outcome.outcome_code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {outcome.outcome_code}
                          </Badge>
                        )}
                        <span className="font-medium">{outcome.title}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Outcomes List Component
function OutcomesList({
  items,
  getTypeIcon,
  getMasteryStatusBadge,
}: {
  items: Array<{
    id: string;
    outcome_id: string;
    mastery_score: number | null;
    mastery_achieved: boolean;
    mastery_achieved_at: string | null;
    last_assessed: string | null;
    attempts_count: number;
    score_history: Array<{ date: string; score: number; source: string }>;
    outcome?: LearningOutcome;
  }>;
  getTypeIcon: (type: string) => React.ReactNode;
  getMasteryStatusBadge: (achieved: boolean, score: number | null) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No outcomes in this category</h3>
          <p className="text-muted-foreground">
            Complete assessments to start tracking your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted">
                {getTypeIcon(item.outcome?.outcome_type || "course")}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {item.outcome?.outcome_code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.outcome.outcome_code}
                        </Badge>
                      )}
                      <span className="font-medium">
                        {item.outcome?.title || "Learning Outcome"}
                      </span>
                    </div>
                    {item.outcome?.description && (
                      <p className="text-sm text-muted-foreground">
                        {item.outcome.description}
                      </p>
                    )}
                  </div>
                  {getMasteryStatusBadge(item.mastery_achieved, item.mastery_score)}
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Mastery Progress</span>
                      <span className="font-medium">
                        {item.mastery_score?.toFixed(0) || 0}%
                        {item.outcome?.mastery_threshold && (
                          <span className="text-muted-foreground">
                            {" "}
                            / {item.outcome.mastery_threshold}% required
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress
                      value={item.mastery_score || 0}
                      className="h-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{item.attempts_count} assessment{item.attempts_count !== 1 ? "s" : ""}</span>
                  {item.last_assessed && (
                    <span>Last assessed: {formatDate(item.last_assessed)}</span>
                  )}
                  {item.mastery_achieved_at && (
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle className="h-3 w-3" />
                      Mastered on {formatDate(item.mastery_achieved_at)}
                    </span>
                  )}
                </div>

                {/* Score History */}
                {item.score_history && item.score_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Score History
                    </p>
                    <div className="flex items-center gap-2">
                      {item.score_history.slice(-5).map((history, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 bg-muted rounded text-xs"
                          title={`${history.source} - ${formatDate(history.date)}`}
                        >
                          {history.score.toFixed(0)}%
                        </div>
                      ))}
                      {item.score_history.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.score_history.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

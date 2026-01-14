"use client";

import { useState } from "react";
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  ClipboardCheck,
  Search,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import {
  useSkillSheetTemplates,
  useSkillSheetAttempts,
  useSkillCategories,
  useStudentSkillProgress,
  type SkillSheetTemplate,
  type SkillSheetAttempt,
  type CertificationLevel,
  type StepResult,
} from "@/lib/hooks/use-skill-sheets";
import { useUser } from "@/lib/hooks/use-user";

export default function StudentSkillSheetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<CertificationLevel | "">("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<SkillSheetTemplate | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<SkillSheetAttempt | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [criticalFailures, setCriticalFailures] = useState<string[]>([]);

  const { profile } = useUser();
  const { categories } = useSkillCategories();
  const { progress, isLoading: progressLoading } = useStudentSkillProgress();
  const { templates, isLoading: templatesLoading } = useSkillSheetTemplates({
    certificationLevel: selectedLevel || undefined,
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const {
    attempts,
    isLoading: attemptsLoading,
    startAttempt,
    updateAttempt,
    submitAttempt
  } = useSkillSheetAttempts({
    studentId: profile?.id,
  });

  // Get best status for each template
  const getTemplateStatus = (templateId: string) => {
    const templateAttempts = attempts.filter((a) => a.template_id === templateId);
    if (templateAttempts.some((a) => a.status === "passed")) return "passed";
    if (templateAttempts.some((a) => a.status === "in_progress")) return "in_progress";
    if (templateAttempts.some((a) => a.status === "needs_remediation")) return "pending";
    if (templateAttempts.some((a) => a.status === "failed")) return "failed";
    return "not_started";
  };

  const handleStartPractice = async (template: SkillSheetTemplate) => {
    const attempt = await startAttempt(template.id);
    if (attempt) {
      setActiveTemplate(template);
      setActiveAttempt(attempt);
      setStepResults(
        template.steps?.map((s) => ({ step_id: s.id, completed: false })) || []
      );
      setCriticalFailures([]);
    }
  };

  const handleToggleStep = (stepId: string) => {
    setStepResults((prev) =>
      prev.map((s) =>
        s.step_id === stepId ? { ...s, completed: !s.completed } : s
      )
    );
  };

  const handleToggleCriticalFailure = (criteria: string) => {
    setCriticalFailures((prev) =>
      prev.includes(criteria)
        ? prev.filter((c) => c !== criteria)
        : [...prev, criteria]
    );
  };

  const handleSaveProgress = async () => {
    if (!activeAttempt) return;
    await updateAttempt(activeAttempt.id, {
      step_results: stepResults,
      critical_failures: criticalFailures,
    });
  };

  const handleSubmitForReview = async () => {
    if (!activeAttempt) return;
    await updateAttempt(activeAttempt.id, {
      step_results: stepResults,
      critical_failures: criticalFailures,
    });
    await submitAttempt(activeAttempt.id);
    setActiveTemplate(null);
    setActiveAttempt(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Skill Sheets
          </h1>
          <p className="text-muted-foreground mt-1">
            Practice and track your NREMT psychomotor skills
          </p>
        </div>
      </div>

      {/* Progress Summary */}
      {!progressLoading && progress && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress.totalTemplates}</p>
                <p className="text-sm text-muted-foreground">Total Skills</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress.passedCount}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress.pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress.failedCount}</p>
                <p className="text-sm text-muted-foreground">Need Retry</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skill sheets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="rounded-md border px-3 py-2"
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value as CertificationLevel | "")}
        >
          <option value="">All Levels</option>
          <option value="EMR">EMR</option>
          <option value="EMT">EMT</option>
          <option value="AEMT">AEMT</option>
          <option value="Paramedic">Paramedic</option>
        </select>
        <select
          className="rounded-md border px-3 py-2"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Skills Grid */}
      {templatesLoading || attemptsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No Skill Sheets Found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedLevel || selectedCategory
              ? "Try adjusting your filters"
              : "Skill sheets will appear here"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const status = getTemplateStatus(template.id);
            return (
              <Card
                key={template.id}
                className={`p-4 transition-shadow hover:shadow-md ${
                  status === "passed" ? "border-green-200 bg-green-50/50" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.skill_code}</p>
                  </div>
                  {status === "passed" && (
                    <Trophy className="h-5 w-5 text-green-600" />
                  )}
                  {status === "failed" && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {status === "pending" && (
                    <Clock className="h-5 w-5 text-orange-500" />
                  )}
                  {status === "in_progress" && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{template.certification_level}</Badge>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {template.steps?.length || 0} steps •{" "}
                  {template.time_limit_seconds
                    ? `${Math.floor(template.time_limit_seconds / 60)}min limit`
                    : "No time limit"}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {status === "passed" && (
                      <span className="text-green-600 font-medium">Completed</span>
                    )}
                    {status === "failed" && (
                      <span className="text-red-600 font-medium">Needs Retry</span>
                    )}
                    {status === "pending" && (
                      <span className="text-orange-600 font-medium">Awaiting Review</span>
                    )}
                    {status === "in_progress" && (
                      <span className="text-yellow-600 font-medium">In Progress</span>
                    )}
                    {status === "not_started" && (
                      <span className="text-muted-foreground">Not Started</span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant={status === "passed" ? "outline" : "default"}
                    onClick={() => handleStartPractice(template)}
                    disabled={status === "pending"}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {status === "passed" ? "Review" : status === "in_progress" ? "Continue" : "Start"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Practice Modal */}
      {activeTemplate && activeAttempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-primary/5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{activeTemplate.name}</h2>
                  <p className="text-muted-foreground">{activeTemplate.skill_code}</p>
                </div>
                <Badge>{activeTemplate.certification_level}</Badge>
              </div>
              {activeTemplate.time_limit_seconds && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Time limit: {Math.floor(activeTemplate.time_limit_seconds / 60)} minutes
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Critical Criteria Warning */}
              {activeTemplate.critical_criteria && activeTemplate.critical_criteria.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Critical Criteria (Automatic Failure)
                  </h3>
                  <p className="text-sm text-red-600 mb-3">
                    Mark any that occurred during this attempt:
                  </p>
                  <div className="space-y-2">
                    {activeTemplate.critical_criteria.map((criteria, i) => (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-2 rounded cursor-pointer ${
                          criticalFailures.includes(criteria)
                            ? "bg-red-100"
                            : "hover:bg-red-100/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={criticalFailures.includes(criteria)}
                          onChange={() => handleToggleCriticalFailure(criteria)}
                          className="mt-1"
                        />
                        <span className="text-sm">{criteria}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluation Steps */}
              <div>
                <h3 className="font-semibold mb-3">Evaluation Steps</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check each step as you complete it:
                </p>
                <div className="space-y-2">
                  {activeTemplate.steps?.map((step, i) => {
                    const result = stepResults.find((r) => r.step_id === step.id);
                    return (
                      <label
                        key={step.id}
                        className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                          result?.completed
                            ? "bg-green-50 border-green-200"
                            : "hover:bg-muted/50"
                        } ${step.is_critical ? "border-l-4 border-l-red-500" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={result?.completed || false}
                          onChange={() => handleToggleStep(step.id)}
                          className="mt-1"
                        />
                        <span className="font-mono text-sm text-muted-foreground w-6">
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          <span className={step.is_critical ? "text-red-700" : ""}>
                            {step.description}
                          </span>
                          {step.is_critical && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        {result?.completed && (
                          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Progress</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-2xl font-bold">
                      {stepResults.filter((s) => s.completed).length}
                    </span>
                    <span className="text-muted-foreground">
                      /{activeTemplate.steps?.length || 0} steps
                    </span>
                  </div>
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${
                          ((stepResults.filter((s) => s.completed).length || 0) /
                            (activeTemplate.steps?.length || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  {criticalFailures.length > 0 && (
                    <Badge variant="destructive">
                      {criticalFailures.length} Critical Failure(s)
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  handleSaveProgress();
                  setActiveTemplate(null);
                  setActiveAttempt(null);
                }}
              >
                Save & Exit
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSaveProgress}>
                  Save Progress
                </Button>
                <Button onClick={handleSubmitForReview}>
                  Submit for Review
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

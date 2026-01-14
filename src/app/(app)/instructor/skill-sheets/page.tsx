"use client";

import { useState } from "react";
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  ClipboardCheck,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Users,
} from "lucide-react";
import {
  useSkillSheetTemplates,
  useSkillSheetAttempts,
  useSkillCategories,
  type SkillSheetTemplate,
  type SkillSheetAttempt,
  type CertificationLevel,
} from "@/lib/hooks/use-skill-sheets";

export default function InstructorSkillSheetsPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "pending" | "graded">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<CertificationLevel | "">("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SkillSheetTemplate | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<SkillSheetAttempt | null>(null);

  const { categories } = useSkillCategories();
  const { templates, isLoading: templatesLoading } = useSkillSheetTemplates({
    certificationLevel: selectedLevel || undefined,
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const { attempts: pendingAttempts, isLoading: pendingLoading, gradeAttempt } = useSkillSheetAttempts({
    status: "needs_remediation",
  });

  const { attempts: gradedAttempts, isLoading: gradedLoading } = useSkillSheetAttempts();

  const filteredGraded = gradedAttempts.filter(
    (a) => a.status === "passed" || a.status === "failed"
  );

  const handleGradeAttempt = async (passed: boolean) => {
    if (!selectedAttempt) return;

    const template = selectedAttempt.template;
    if (!template) return;

    // Calculate score from step results
    const stepResults = selectedAttempt.step_results || [];
    const completedSteps = stepResults.filter((s) => s.completed).length;
    const totalSteps = template.steps?.length || 1;
    const score = Math.round((completedSteps / totalSteps) * 100);

    await gradeAttempt(selectedAttempt.id, {
      step_results: stepResults,
      critical_failures: selectedAttempt.critical_failures || [],
      total_score: score,
      status: passed ? "passed" : "failed",
      evaluator_notes: "",
    });

    setSelectedAttempt(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            NREMT Skill Sheets
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage psychomotor skill evaluations and track student competencies
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("templates")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "templates"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Skill Templates
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "pending"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Review
            {pendingAttempts.length > 0 && (
              <Badge variant="destructive">{pendingAttempts.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("graded")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "graded"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Graded
          </button>
        </div>
      </div>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-4">
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

          {/* Templates Grid */}
          {templatesLoading ? (
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
                  : "Skill sheet templates will appear here"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.skill_code}</p>
                    </div>
                    <Badge variant={template.is_nremt_official ? "default" : "secondary"}>
                      {template.certification_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {template.description || `${template.steps?.length || 0} evaluation steps`}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{template.category}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {template.time_limit_seconds
                        ? `${Math.floor(template.time_limit_seconds / 60)}min`
                        : "No limit"}
                    </div>
                  </div>
                  {template.is_nremt_official && (
                    <Badge variant="outline" className="mt-2">
                      Official NREMT
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Review Tab */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : pendingAttempts.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No skill sheets pending review
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingAttempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedAttempt(attempt)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{attempt.template?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {attempt.student?.full_name} • Attempt #{attempt.attempt_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Awaiting Review</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attempt.completed_at
                          ? new Date(attempt.completed_at).toLocaleDateString()
                          : "In Progress"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Graded Tab */}
      {activeTab === "graded" && (
        <div className="space-y-4">
          {gradedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : filteredGraded.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Graded Attempts</h3>
              <p className="text-muted-foreground">
                Graded skill sheet attempts will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredGraded.map((attempt) => (
                <Card
                  key={attempt.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedAttempt(attempt)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          attempt.status === "passed"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {attempt.status === "passed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{attempt.template?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {attempt.student?.full_name} • Attempt #{attempt.attempt_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={attempt.status === "passed" ? "default" : "destructive"}
                      >
                        {attempt.status === "passed" ? "Passed" : "Failed"}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        Score: {attempt.total_score}%
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                  <p className="text-muted-foreground">{selectedTemplate.skill_code}</p>
                </div>
                <Badge>{selectedTemplate.certification_level}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedTemplate.description && (
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{selectedTemplate.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Passing Score:</span>
                  <p className="font-medium">{selectedTemplate.passing_score}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Limit:</span>
                  <p className="font-medium">
                    {selectedTemplate.time_limit_seconds
                      ? `${Math.floor(selectedTemplate.time_limit_seconds / 60)} minutes`
                      : "None"}
                  </p>
                </div>
              </div>

              {selectedTemplate.critical_criteria && selectedTemplate.critical_criteria.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">Critical Criteria (Auto-Fail)</h3>
                  <ul className="space-y-1">
                    {selectedTemplate.critical_criteria.map((criteria, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Evaluation Steps</h3>
                <ol className="space-y-2">
                  {selectedTemplate.steps?.map((step, i) => (
                    <li
                      key={step.id}
                      className={`flex items-start gap-3 p-2 rounded ${
                        step.is_critical ? "bg-red-50" : ""
                      }`}
                    >
                      <span className="font-mono text-sm text-muted-foreground w-6">
                        {i + 1}.
                      </span>
                      <span className={step.is_critical ? "text-red-700" : ""}>
                        {step.description}
                        {step.is_critical && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Critical
                          </Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Grade Attempt Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedAttempt.template?.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedAttempt.student?.full_name} • Attempt #{selectedAttempt.attempt_number}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedAttempt.status === "passed"
                      ? "default"
                      : selectedAttempt.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedAttempt.status}
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Started:</span>
                  <p className="font-medium">
                    {new Date(selectedAttempt.started_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <p className="font-medium">
                    {selectedAttempt.completed_at
                      ? new Date(selectedAttempt.completed_at).toLocaleString()
                      : "In Progress"}
                  </p>
                </div>
              </div>

              {selectedAttempt.student_notes && (
                <div>
                  <h3 className="font-semibold mb-1">Student Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded">{selectedAttempt.student_notes}</p>
                </div>
              )}

              {selectedAttempt.total_score !== null && (
                <div>
                  <h3 className="font-semibold mb-1">Score</h3>
                  <p className="text-2xl font-bold">{selectedAttempt.total_score}%</p>
                </div>
              )}

              {selectedAttempt.critical_failures && selectedAttempt.critical_failures.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">Critical Failures</h3>
                  <ul className="space-y-1">
                    {selectedAttempt.critical_failures.map((failure, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {failure}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAttempt.evaluator_notes && (
                <div>
                  <h3 className="font-semibold mb-1">Evaluator Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded">{selectedAttempt.evaluator_notes}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedAttempt(null)}>
                Close
              </Button>
              {selectedAttempt.status === "needs_remediation" && (
                <>
                  <Button variant="destructive" onClick={() => handleGradeAttempt(false)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Failed
                  </Button>
                  <Button onClick={() => handleGradeAttempt(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Passed
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

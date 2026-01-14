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
  Input,
  Label,
  Textarea,
  Modal,
  Spinner,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Progress,
} from "@/components/ui";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Target,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Building2,
  GraduationCap,
  Link as LinkIcon,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  useLearningOutcomes,
  useCourseOutcomeReport,
  type LearningOutcome,
  type OutcomeType,
} from "@/lib/hooks/use-outcomes";
import { useCourses } from "@/lib/hooks/use-courses";

export default function InstructorOutcomesPage() {
  const { outcomes, flatOutcomes, isLoading, createOutcome, updateOutcome, deleteOutcome } =
    useLearningOutcomes();
  const { data: courses = [] } = useCourses();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<OutcomeType | "all">("all");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editingOutcome, setEditingOutcome] = React.useState<LearningOutcome | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [expandedOutcomes, setExpandedOutcomes] = React.useState<Set<string>>(new Set());
  const [selectedCourseForReport, setSelectedCourseForReport] = React.useState<string>("");

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    outcome_code: "",
    outcome_type: "course" as OutcomeType,
    course_id: "",
    parent_outcome_id: "",
    mastery_threshold: 70,
  });

  const filteredOutcomes = React.useMemo(() => {
    let result = flatOutcomes;

    if (typeFilter !== "all") {
      result = result.filter((o) => o.outcome_type === typeFilter);
    }

    if (searchTerm) {
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.outcome_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [flatOutcomes, typeFilter, searchTerm]);

  const toggleExpanded = (id: string) => {
    setExpandedOutcomes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    await createOutcome({
      title: formData.title,
      description: formData.description || undefined,
      outcome_code: formData.outcome_code || undefined,
      outcome_type: formData.outcome_type,
      course_id: formData.course_id || undefined,
      parent_outcome_id: formData.parent_outcome_id || undefined,
      mastery_threshold: formData.mastery_threshold,
    });
    setCreateModalOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingOutcome) return;
    await updateOutcome(editingOutcome.id, {
      title: formData.title,
      description: formData.description || null,
      outcome_code: formData.outcome_code || null,
      outcome_type: formData.outcome_type,
      mastery_threshold: formData.mastery_threshold,
    });
    setEditingOutcome(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteOutcome(deleteConfirm);
    setDeleteConfirm(null);
  };

  const openEditModal = (outcome: LearningOutcome) => {
    setFormData({
      title: outcome.title,
      description: outcome.description || "",
      outcome_code: outcome.outcome_code || "",
      outcome_type: outcome.outcome_type,
      course_id: outcome.course_id || "",
      parent_outcome_id: outcome.parent_outcome_id || "",
      mastery_threshold: outcome.mastery_threshold,
    });
    setEditingOutcome(outcome);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      outcome_code: "",
      outcome_type: "course",
      course_id: "",
      parent_outcome_id: "",
      mastery_threshold: 70,
    });
  };

  const getTypeIcon = (type: OutcomeType) => {
    switch (type) {
      case "course":
        return <BookOpen className="h-4 w-4" />;
      case "program":
        return <GraduationCap className="h-4 w-4" />;
      case "institutional":
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: OutcomeType) => {
    switch (type) {
      case "course":
        return <Badge variant="info">Course</Badge>;
      case "program":
        return <Badge variant="warning">Program</Badge>;
      case "institutional":
        return <Badge variant="secondary">Institutional</Badge>;
    }
  };

  // Stats
  const courseOutcomes = flatOutcomes.filter((o) => o.outcome_type === "course");
  const programOutcomes = flatOutcomes.filter((o) => o.outcome_type === "program");
  const institutionalOutcomes = flatOutcomes.filter((o) => o.outcome_type === "institutional");

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
            Define and track learning outcomes for courses and programs
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Outcome
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{flatOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Total Outcomes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <BookOpen className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{courseOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Course Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <GraduationCap className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{programOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Program Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Building2 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{institutionalOutcomes.length}</div>
                <p className="text-sm text-muted-foreground">Institutional</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="manage">Manage Outcomes</TabsTrigger>
          <TabsTrigger value="report">Course Report</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search outcomes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as OutcomeType | "all")}
              options={[
                { value: "all", label: "All Types" },
                { value: "course", label: "Course Level" },
                { value: "program", label: "Program Level" },
                { value: "institutional", label: "Institutional" },
              ]}
              className="w-[180px]"
            />
          </div>

          {/* Outcomes List */}
          {filteredOutcomes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No outcomes found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Create your first learning outcome"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Outcome
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredOutcomes.map((outcome) => (
                <Card key={outcome.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {outcome.children && outcome.children.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(outcome.id)}
                            className="p-1 hover:bg-muted rounded mt-0.5"
                          >
                            {expandedOutcomes.has(outcome.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            marginLeft: outcome.depth ? `${outcome.depth * 24}px` : 0,
                          }}
                        >
                          {getTypeIcon(outcome.outcome_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {outcome.outcome_code && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {outcome.outcome_code}
                              </Badge>
                            )}
                            <span className="font-medium">{outcome.title}</span>
                            {getTypeBadge(outcome.outcome_type)}
                          </div>
                          {outcome.description && (
                            <p className="text-sm text-muted-foreground">
                              {outcome.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Mastery: {outcome.mastery_threshold}%</span>
                            {outcome.course && (
                              <span className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                {outcome.course.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(outcome)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(outcome.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Course Outcome Report
              </CardTitle>
              <CardDescription>
                View student mastery progress for outcomes in a specific course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <Select
                    value={selectedCourseForReport}
                    onChange={setSelectedCourseForReport}
                    options={courses.map((course) => ({
                      value: course.id,
                      label: course.title,
                    }))}
                    placeholder="Choose a course..."
                  />
                </div>

                {selectedCourseForReport && (
                  <CourseOutcomeReportView courseId={selectedCourseForReport} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={createModalOpen || editingOutcome !== null}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingOutcome(null);
          resetForm();
        }}
        title={editingOutcome ? "Edit Outcome" : "Create Outcome"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Outcome Code (Optional)</Label>
              <Input
                value={formData.outcome_code}
                onChange={(e) =>
                  setFormData({ ...formData, outcome_code: e.target.value })
                }
                placeholder="e.g., LO-1.1 or EMT-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.outcome_type}
                onChange={(v) =>
                  setFormData({ ...formData, outcome_type: v as OutcomeType })
                }
                options={[
                  { value: "course", label: "Course Level" },
                  { value: "program", label: "Program Level" },
                  { value: "institutional", label: "Institutional" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Demonstrate proper airway management techniques"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed description of the learning outcome..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Associated Course (Optional)</Label>
              <Select
                value={formData.course_id}
                onChange={(v) => setFormData({ ...formData, course_id: v })}
                options={[
                  { value: "", label: "None (Global)" },
                  ...courses.map((course) => ({
                    value: course.id,
                    label: course.title,
                  })),
                ]}
                placeholder="Select course..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mastery Threshold (%)</Label>
              <Input
                type="number"
                value={formData.mastery_threshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mastery_threshold: parseInt(e.target.value) || 70,
                  })
                }
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parent Outcome (Optional)</Label>
            <Select
              value={formData.parent_outcome_id}
              onChange={(v) =>
                setFormData({ ...formData, parent_outcome_id: v })
              }
              options={[
                { value: "", label: "None (Root Level)" },
                ...flatOutcomes
                  .filter((o) => o.id !== editingOutcome?.id)
                  .map((outcome) => ({
                    value: outcome.id,
                    label: outcome.outcome_code
                      ? `${outcome.outcome_code} - ${outcome.title}`
                      : outcome.title,
                  })),
              ]}
              placeholder="Select parent outcome..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingOutcome(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingOutcome ? handleUpdate : handleCreate}
              disabled={!formData.title.trim()}
            >
              {editingOutcome ? "Save Changes" : "Create Outcome"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Outcome"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this outcome? This will also remove
            all alignments and mastery records associated with it.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Course Outcome Report Component
function CourseOutcomeReportView({ courseId }: { courseId: string }) {
  const { report, isLoading } = useCourseOutcomeReport(courseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No outcome data available for this course
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outcome Statistics */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Outcome Achievement
        </h4>
        <div className="space-y-3">
          {report.outcomes.map(({ outcome, studentCount, masteredCount, averageScore, alignedAssessments }) => (
            <div key={outcome.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {outcome.outcome_code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {outcome.outcome_code}
                      </Badge>
                    )}
                    <span className="font-medium">{outcome.title}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">
                    {masteredCount}/{studentCount}
                  </span>
                  <span className="text-muted-foreground"> mastered</span>
                </div>
              </div>
              <Progress
                value={studentCount > 0 ? (masteredCount / studentCount) * 100 : 0}
                className="h-2 mb-2"
              />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Avg Score: {averageScore.toFixed(1)}%</span>
                <span className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  {alignedAssessments} aligned assessments
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Performance */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Student Performance
        </h4>
        {report.students.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No student mastery data yet
          </div>
        ) : (
          <div className="space-y-2">
            {report.students.map(({ student, overallMastery }) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="font-medium">{student.full_name}</span>
                <div className="flex items-center gap-3">
                  <Progress value={overallMastery} className="w-24 h-2" />
                  <span className="text-sm font-medium w-12 text-right">
                    {overallMastery.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

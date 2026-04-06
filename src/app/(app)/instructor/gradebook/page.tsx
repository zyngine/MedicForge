"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import * as React from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Spinner,
  Modal,
  Checkbox,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
} from "@/components/ui";
import {
  Download,
  FileSpreadsheet,
  Save,
  Trash2,
  Plus,
  Search,
  Eye,
  Edit,
  Users,
  Target,
  GraduationCap,
  TrendingUp,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  useGradebookExportTemplates,
  useQuickExport,
  type GradebookExportTemplate,
} from "@/lib/hooks/use-gradebook-export";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useSubmissions } from "@/lib/hooks/use-submissions";
import { formatDate } from "@/lib/utils";

const AVAILABLE_FIELDS = [
  { id: "student_name", label: "Student Name", category: "student" },
  { id: "student_email", label: "Student Email", category: "student" },
  { id: "student_id", label: "Student ID", category: "student" },
  { id: "course_name", label: "Course Name", category: "course" },
  { id: "enrollment_status", label: "Enrollment Status", category: "course" },
  { id: "assignment_title", label: "Assignment Title", category: "assignment" },
  { id: "assignment_type", label: "Assignment Type", category: "assignment" },
  { id: "points_possible", label: "Points Possible", category: "assignment" },
  { id: "raw_score", label: "Raw Score", category: "grades" },
  { id: "curved_score", label: "Curved Score", category: "grades" },
  { id: "final_score", label: "Final Score", category: "grades" },
  { id: "percentage", label: "Percentage", category: "grades" },
  { id: "letter_grade", label: "Letter Grade", category: "grades" },
  { id: "submitted_at", label: "Submitted Date", category: "dates" },
  { id: "graded_at", label: "Graded Date", category: "dates" },
  { id: "due_date", label: "Due Date", category: "dates" },
  { id: "feedback", label: "Feedback", category: "other" },
  { id: "attempts", label: "Attempts", category: "other" },
];

export default function InstructorGradebookPage() {
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses();
  const { data: allEnrollments = [] } = useEnrollments();
  const { data: allSubmissions = [] } = useSubmissions({});
  const {
    templates,
    isLoading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useGradebookExportTemplates();
  const { quickExportCSV } = useQuickExport();

  const [selectedCourse, setSelectedCourse] = React.useState<string>("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [templateModal, setTemplateModal] = React.useState<{
    mode: "create" | "edit";
    template?: GradebookExportTemplate;
  } | null>(null);
  const [_previewModal, _setPreviewModal] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<{
    name: string;
    email: string;
    submissions: Array<{
      assignment: string;
      type: string;
      score: number | null;
      percentage: number | null;
      submitted: string | null;
    }>;
    averageScore: number;
  } | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = React.useState({
    name: "",
    description: "",
    format: "csv" as "csv" | "json" | "xlsx",
    fields: ["student_name", "assignment_title", "final_score", "percentage"],
    includeUnsubmitted: false,
  });

  // Get course-specific data
  const courseEnrollments = selectedCourse
    ? allEnrollments.filter((e) => e.course_id === selectedCourse)
    : [];

  const courseSubmissions = selectedCourse
    ? allSubmissions.filter((s) =>
        courseEnrollments.some((e) => e.student_id === s.student_id)
      )
    : [];

  // Build gradebook data for preview
  const gradebookData = React.useMemo(() => {
    if (!selectedCourse) return [];

    const studentMap = new Map<string, {
      name: string;
      email: string;
      submissions: Array<{
        assignment: string;
        type: string;
        score: number | null;
        percentage: number | null;
        submitted: string | null;
      }>;
      averageScore: number;
    }>();

    for (const enrollment of courseEnrollments) {
      if (!enrollment.student) continue;

      const studentSubmissions = courseSubmissions.filter(
        (s) => s.student_id === enrollment.student_id
      );

      const scores = studentSubmissions
        .filter((s) => s.final_score != null)
        .map((s) => s.final_score!);

      studentMap.set(enrollment.student_id, {
        name: enrollment.student.full_name,
        email: enrollment.student.email || "",
        submissions: studentSubmissions.map((s) => ({
          assignment: s.assignment?.title || "Assignment",
          type: s.assignment?.type || "unknown",
          score: s.final_score,
          percentage: s.assignment?.points_possible
            ? Math.round((s.final_score || 0) / s.assignment.points_possible * 100)
            : null,
          submitted: s.submitted_at,
        })),
        averageScore: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
      });
    }

    return Array.from(studentMap.values())
      .filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [selectedCourse, courseEnrollments, courseSubmissions, searchTerm]);

  const handleCreateTemplate = async () => {
    await createTemplate({
      name: templateForm.name,
      format: templateForm.format,
      columns: templateForm.fields,
      settings: {
        include_ungraded: templateForm.includeUnsubmitted,
      },
    });
    setTemplateModal(null);
    resetTemplateForm();
  };

  const handleUpdateTemplate = async () => {
    if (!templateModal?.template) return;
    await updateTemplate(templateModal.template.id, {
      name: templateForm.name,
      format: templateForm.format,
      columns: templateForm.fields,
      settings: {
        include_ungraded: templateForm.includeUnsubmitted,
      },
    });
    setTemplateModal(null);
    resetTemplateForm();
  };

  const handleExport = async (_templateId?: string) => {
    if (!selectedCourse) return;
    setIsExporting(true);
    try {
      // For now, use quick export for all cases
      // Template-based export would require more complex implementation
      await quickExportCSV(selectedCourse);
    } finally {
      setIsExporting(false);
    }
  };

  const openEditTemplate = (template: GradebookExportTemplate) => {
    setTemplateForm({
      name: template.name,
      description: "",
      format: template.format as "csv" | "json" | "xlsx",
      fields: template.columns || [],
      includeUnsubmitted: template.settings?.include_ungraded || false,
    });
    setTemplateModal({ mode: "edit", template });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      format: "csv",
      fields: ["student_name", "assignment_title", "final_score", "percentage"],
      includeUnsubmitted: false,
    });
  };

  const toggleField = (fieldId: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      fields: prev.fields.includes(fieldId)
        ? prev.fields.filter((f) => f !== fieldId)
        : [...prev.fields, fieldId],
    }));
  };

  // Stats
  const totalStudents = gradebookData.length;
  const averageScore = totalStudents > 0
    ? Math.round(gradebookData.reduce((sum, s) => sum + s.averageScore, 0) / totalStudents)
    : 0;
  const passingStudents = gradebookData.filter((s) => s.averageScore >= 70).length;

  const isLoading = coursesLoading || templatesLoading;

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
            <FileSpreadsheet className="h-6 w-6" />
            Gradebook
          </h1>
          <p className="text-muted-foreground">
            View, manage, and export student grades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCourse}
            onChange={setSelectedCourse}
            options={courses.map((course) => ({
              value: course.id,
              label: course.title,
            }))}
            placeholder="Select a course"
            className="w-[250px]"
          />
          <Link href={`/instructor/gradebook/import${selectedCourse ? `?course=${selectedCourse}` : ""}`}>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Grades
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => handleExport()}
            disabled={!selectedCourse || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Quick Export
          </Button>
        </div>
      </div>

      {!selectedCourse ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Course</h3>
            <p className="text-muted-foreground">
              Choose a course above to view and export the gradebook
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                    <p className="text-sm text-muted-foreground">Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Target className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{averageScore}%</p>
                    <p className="text-sm text-muted-foreground">Class Average</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <GraduationCap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{passingStudents}</p>
                    <p className="text-sm text-muted-foreground">Passing (70%+)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {totalStudents > 0 ? Math.round((passingStudents / totalStudents) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="grades">
            <TabsList>
              <TabsTrigger value="grades">Gradebook</TabsTrigger>
              <TabsTrigger value="templates">Export Templates ({templates.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Gradebook Table */}
              <Card>
                <CardContent className="p-0">
                  {gradebookData.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No students found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "Try adjusting your search"
                          : "No students enrolled in this course"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left py-3 px-4 font-medium">Student</th>
                            <th className="text-center py-3 px-4 font-medium">Submissions</th>
                            <th className="text-center py-3 px-4 font-medium">Average</th>
                            <th className="text-center py-3 px-4 font-medium">Grade</th>
                            <th className="text-right py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradebookData.map((student) => {
                            const letterGrade = getLetterGrade(student.averageScore);
                            return (
                              <tr key={student.email} className="border-b last:border-0">
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">{student.email}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {student.submissions.length}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={getScoreColor(student.averageScore)}>
                                    {student.averageScore}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant={getGradeBadgeVariant(letterGrade)}>
                                    {letterGrade}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedStudent(student)}
                                    title="View student details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setTemplateModal({ mode: "create" })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>

              {templates.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No export templates</h3>
                    <p className="text-muted-foreground mb-4">
                      Create templates to quickly export gradebooks with custom fields
                    </p>
                    <Button onClick={() => setTemplateModal({ mode: "create" })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                            {template.is_default && <Badge variant="success">Default</Badge>}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {template.columns?.length || 0} fields included
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleExport(template.id)}
                            disabled={!selectedCourse || isExporting}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditTemplate(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Student Detail Modal */}
      <Modal
        isOpen={selectedStudent !== null}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.name || "Student Details"}
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-medium">{selectedStudent.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{selectedStudent.averageScore}%</p>
                <Badge variant={getGradeBadgeVariant(getLetterGrade(selectedStudent.averageScore))}>
                  {getLetterGrade(selectedStudent.averageScore)}
                </Badge>
              </div>
            </div>

            {/* Submissions List */}
            <div>
              <h4 className="font-medium mb-3">Submissions ({selectedStudent.submissions.length})</h4>
              {selectedStudent.submissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No submissions yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.submissions.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sub.assignment}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {sub.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        {sub.score !== null ? (
                          <>
                            <p className={`font-bold ${getScoreColor(sub.percentage || 0)}`}>
                              {sub.score}
                              {sub.percentage !== null && ` (${sub.percentage}%)`}
                            </p>
                            {sub.submitted && (
                              <p className="text-xs text-muted-foreground">
                                {formatDate(sub.submitted)}
                              </p>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary">Not Graded</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Modal */}
      <Modal
        isOpen={templateModal !== null}
        onClose={() => {
          setTemplateModal(null);
          resetTemplateForm();
        }}
        title={templateModal?.mode === "create" ? "Create Export Template" : "Edit Template"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g., Final Grades Export"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={templateForm.format}
                onChange={(v) =>
                  setTemplateForm({ ...templateForm, format: v as "csv" | "json" | "xlsx" })
                }
                options={[
                  { value: "csv", label: "CSV" },
                  { value: "json", label: "JSON" },
                  { value: "xlsx", label: "Excel (XLSX)" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              placeholder="Describe this template's purpose..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Fields to Include</Label>
            <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
              {["student", "course", "assignment", "grades", "dates", "other"].map((category) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h4 className="text-sm font-medium capitalize mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_FIELDS.filter((f) => f.category === category).map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Checkbox
                          id={field.id}
                          checked={templateForm.fields.includes(field.id)}
                          onChange={() => toggleField(field.id)}
                        />
                        <Label htmlFor={field.id} className="text-sm cursor-pointer">
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="includeUnsubmitted"
              checked={templateForm.includeUnsubmitted}
              onChange={(checked) =>
                setTemplateForm({ ...templateForm, includeUnsubmitted: checked as boolean })
              }
            />
            <Label htmlFor="includeUnsubmitted" className="cursor-pointer">
              Include unsubmitted assignments (show as 0)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setTemplateModal(null);
                resetTemplateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={templateModal?.mode === "create" ? handleCreateTemplate : handleUpdateTemplate}
              disabled={!templateForm.name.trim() || templateForm.fields.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {templateModal?.mode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Helper functions
function getLetterGrade(score: number): string {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-success font-medium";
  if (score >= 80) return "text-info font-medium";
  if (score >= 70) return "text-warning font-medium";
  return "text-destructive font-medium";
}

function getGradeBadgeVariant(grade: string): "success" | "info" | "warning" | "destructive" | "secondary" {
  if (grade.startsWith("A")) return "success";
  if (grade.startsWith("B")) return "info";
  if (grade.startsWith("C")) return "warning";
  if (grade.startsWith("D")) return "secondary";
  return "destructive";
}

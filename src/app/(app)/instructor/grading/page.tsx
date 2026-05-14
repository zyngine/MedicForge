"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  Label,
  Textarea,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Download,
  BarChart3,
  TrendingUp,
  Edit,
} from "lucide-react";
import { useSubmissions, usePendingSubmissions, useGradeSubmission, useApplyGradeCurve } from "@/lib/hooks/use-submissions";
import { SubmissionPreview } from "@/components/grading/submission-preview";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { previewCurve, type CurveMethod, type ScoreInput, type CurveResult } from "@/lib/grading";

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "quiz", label: "Quiz" },
  { value: "written", label: "Written" },
  { value: "skill", label: "Skill Checklist" },
];

const curveOptions: { value: CurveMethod; label: string; description: string }[] = [
  { value: "none", label: "No Curve", description: "Keep original scores" },
  { value: "bell", label: "Bell Curve", description: "Adjust mean to target (e.g., 80%)" },
  { value: "sqrt", label: "Square Root", description: "sqrt(score/max) * max - helps lower scores more" },
  { value: "linear", label: "Linear", description: "Highest score becomes 100%" },
  { value: "flat", label: "Flat Bonus", description: "Add fixed points to all" },
];

function getTypeIcon(type: string) {
  switch (type) {
    case "quiz":
      return <ClipboardCheck className="h-4 w-4" />;
    case "written":
      return <FileText className="h-4 w-4" />;
    case "skill":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return hours === 0 ? "Just now" : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

interface SubmissionDisplay {
  id: string;
  student: { name: string; email: string };
  assignment: string;
  assignmentType: string;
  course: string;
  submittedAt: string;
  dueDate?: string;
  autoScore: number | null;
  maxScore: number;
  rawScore?: number | null;
  curvedScore?: number | null;
  gradedAt?: string | null;
}

export default function GradingPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [selectedSubmission, setSelectedSubmission] = React.useState<SubmissionDisplay | null>(null);
  const [curveModalOpen, setCurveModalOpen] = React.useState(false);
  const [curveMethod, setCurveMethod] = React.useState<CurveMethod>("none");
  const [curveValue, setCurveValue] = React.useState("80");
  const [gradeScore, setGradeScore] = React.useState("");
  const [gradeFeedback, setGradeFeedback] = React.useState("");
  const [isGrading, setIsGrading] = React.useState(false);
  const [selectedAssignmentForCurve, setSelectedAssignmentForCurve] = React.useState<string>("all");
  const [curvePreview, setCurvePreview] = React.useState<CurveResult | null>(null);
  const [isApplyingCurve, setIsApplyingCurve] = React.useState(false);
  const [curveError, setCurveError] = React.useState<string | null>(null);
  const [curveSuccess, setCurveSuccess] = React.useState(false);

  // Fetch data using hooks
  const { data: pendingSubmissionsRaw = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingSubmissions();
  const { data: gradedSubmissionsRaw = [], isLoading: gradedLoading, refetch: refetchGraded } = useSubmissions({ status: "graded" });
  const { mutateAsync: gradeSubmission } = useGradeSubmission();
  const { mutateAsync: applyGradeCurve } = useApplyGradeCurve();
  const { data: courses = [], isLoading: _coursesLoading } = useInstructorCourses();

  // Build a course lookup map from instructor courses
  const courseMap = new Map(courses.map(c => [c.id, c.title]));

  // Helper to resolve course name from a submission's assignment -> module -> course_id
  const getCourseName = (sub: (typeof pendingSubmissionsRaw)[number]) => {
    const courseId = sub.assignment?.module?.course_id;
    if (courseId && courseMap.has(courseId)) return courseMap.get(courseId)!;
    return "Unknown Course";
  };

  // Transform submissions for display
  const pendingSubmissions: SubmissionDisplay[] = pendingSubmissionsRaw.map((sub) => ({
    id: sub.id,
    student: {
      name: sub.student?.full_name || "Unknown Student",
      email: sub.student?.email || ""
    },
    assignment: sub.assignment?.title || "Unknown Assignment",
    assignmentType: sub.assignment?.type || "quiz",
    course: getCourseName(sub),
    submittedAt: sub.submitted_at || sub.started_at || "",
    dueDate: sub.assignment?.due_date || undefined,
    autoScore: sub.raw_score,
    maxScore: sub.assignment?.points_possible || 100,
  }));

  const gradedSubmissions: SubmissionDisplay[] = gradedSubmissionsRaw.map((sub) => ({
    id: sub.id,
    student: {
      name: sub.student?.full_name || "Unknown Student",
      email: sub.student?.email || ""
    },
    assignment: sub.assignment?.title || "Unknown Assignment",
    assignmentType: sub.assignment?.type || "quiz",
    course: getCourseName(sub),
    submittedAt: sub.submitted_at || sub.started_at || "",
    gradedAt: sub.graded_at,
    rawScore: sub.raw_score,
    curvedScore: sub.curved_score,
    autoScore: sub.raw_score,
    maxScore: sub.assignment?.points_possible || 100,
  }));

  // Build course options for filter
  const courseOptions = [
    { value: "all", label: "All Courses" },
    ...courses.map(c => ({ value: c.id, label: c.title }))
  ];

  // Build assignment options for curve modal (from graded submissions)
  const assignmentOptionsMap = new Map<string, { id: string; title: string; maxPoints: number }>();
  gradedSubmissionsRaw.forEach((sub) => {
    if (sub.assignment?.id && sub.assignment?.title) {
      assignmentOptionsMap.set(sub.assignment.id, {
        id: sub.assignment.id,
        title: sub.assignment.title,
        maxPoints: sub.assignment.points_possible || 100,
      });
    }
  });
  const assignmentOptionsForCurve = [
    { value: "all", label: "All graded assignments" },
    ...Array.from(assignmentOptionsMap.values()).map(a => ({
      value: a.id,
      label: a.title,
    }))
  ];

  // Calculate curve preview when parameters change
  React.useEffect(() => {
    if (curveMethod === "none") {
      setCurvePreview(null);
      return;
    }

    // Get scores to curve
    let submissionsToCurve = gradedSubmissionsRaw.filter(sub => sub.raw_score !== null);

    if (selectedAssignmentForCurve !== "all") {
      submissionsToCurve = submissionsToCurve.filter(
        sub => sub.assignment?.id === selectedAssignmentForCurve
      );
    }

    if (submissionsToCurve.length === 0) {
      setCurvePreview(null);
      return;
    }

    // Determine max points (use first assignment's max or 100)
    const maxPoints = submissionsToCurve[0]?.assignment?.points_possible || 100;

    const scoreInputs: ScoreInput[] = submissionsToCurve.map(sub => ({
      submissionId: sub.id,
      studentId: sub.student_id,
      rawScore: sub.raw_score || 0,
    }));

    const preview = previewCurve(scoreInputs, {
      method: curveMethod,
      maxPoints,
      targetMean: curveMethod === "bell" ? parseFloat(curveValue) || 80 : undefined,
      bonusPoints: curveMethod === "flat" ? parseFloat(curveValue) || 5 : undefined,
    });

    setCurvePreview(preview);
  }, [curveMethod, curveValue, selectedAssignmentForCurve, gradedSubmissionsRaw]);

  // Handle applying the curve
  const handleApplyCurve = async () => {
    if (!curvePreview || curveMethod === "none") return;

    setIsApplyingCurve(true);
    setCurveError(null);
    setCurveSuccess(false);

    try {
      // Get the assignment ID (or null for all)
      const assignmentId = selectedAssignmentForCurve === "all" ? undefined : selectedAssignmentForCurve;

      // Get max points
      const maxPoints = assignmentOptionsMap.get(selectedAssignmentForCurve)?.maxPoints || 100;

      await applyGradeCurve({
        assignmentId,
        curveMethod,
        targetMean: curveMethod === "bell" ? parseFloat(curveValue) : undefined,
        bonusPoints: curveMethod === "flat" ? parseFloat(curveValue) : undefined,
        maxPoints,
      });

      setCurveSuccess(true);
      refetchGraded();

      // Close modal after short delay
      setTimeout(() => {
        setCurveModalOpen(false);
        setCurveSuccess(false);
        setCurveMethod("none");
      }, 1500);
    } catch (error) {
      console.error("Failed to apply curve:", error);
      setCurveError(error instanceof Error ? error.message : "Failed to apply curve");
    } finally {
      setIsApplyingCurve(false);
    }
  };

  const filteredPending = pendingSubmissions.filter((sub) => {
    const matchesSearch =
      sub.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "all" || sub.course.includes(courseFilter);
    const matchesType = typeFilter === "all" || sub.assignmentType === typeFilter;
    return matchesSearch && matchesCourse && matchesType;
  });

  const handleGradeSubmit = async () => {
    if (!selectedSubmission || !gradeScore) return;

    setIsGrading(true);
    try {
      const score = parseFloat(gradeScore);
      await gradeSubmission({
        submissionId: selectedSubmission.id,
        rawScore: score,
        finalScore: score,
        feedback: gradeFeedback ? { text: gradeFeedback } : undefined,
      });

      setSelectedSubmission(null);
      setGradeScore("");
      setGradeFeedback("");
      refetchPending();
      refetchGraded();
    } catch (error) {
      console.error("Failed to grade submission:", error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleEditGradedSubmission = (submission: SubmissionDisplay) => {
    // Pre-fill with existing score and feedback
    setGradeScore(submission.rawScore?.toString() || submission.autoScore?.toString() || "");
    // Get feedback text if it exists
    const rawSubmission = gradedSubmissionsRaw.find((s) => s.id === submission.id);
    const feedbackText = rawSubmission?.feedback && typeof rawSubmission.feedback === "object"
      ? (rawSubmission.feedback as { text?: string }).text || ""
      : "";
    setGradeFeedback(feedbackText);
    setSelectedSubmission(submission);
  };

  const isLoading = pendingLoading || gradedLoading;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Grading Center</h1>
          <p className="text-muted-foreground">
            Review and grade student submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurveModalOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Apply Curve
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Grades
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{gradedSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">Graded Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingSubmissions.filter((sub) => sub.dueDate && new Date(sub.dueDate) < new Date()).length}
              </p>
              <p className="text-sm text-muted-foreground">Past Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by student or assignment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Select
                options={courseOptions}
                value={courseFilter}
                onChange={setCourseFilter}
                className="w-[200px]"
              />
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-[140px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="graded">
            Recently Graded ({gradedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {filteredPending.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-muted-foreground">No submissions pending review</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPending.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Pre-fill auto score if available
                        setGradeScore(submission.autoScore?.toString() || "");
                        setGradeFeedback("");
                        setSelectedSubmission(submission);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar fallback={submission.student.name} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{submission.student.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {getTypeIcon(submission.assignmentType)}
                              <span className="ml-1 capitalize">{submission.assignmentType}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{submission.assignment}</p>
                          <p className="text-xs text-muted-foreground">{submission.course}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {submission.autoScore !== null && (
                          <div className="text-right">
                            <p className="font-medium">{submission.autoScore}/{submission.maxScore}</p>
                            <p className="text-xs text-muted-foreground">Auto-graded</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{formatDate(submission.submittedAt)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graded">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {gradedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleEditGradedSubmission(submission)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar fallback={submission.student.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{submission.student.name}</p>
                          <Badge variant="success" className="text-xs">Graded</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{submission.assignment}</p>
                        <p className="text-xs text-muted-foreground">{submission.course}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {submission.curvedScore !== submission.rawScore ? (
                          <>
                            <p className="font-medium">
                              <span className="line-through text-muted-foreground mr-2">{submission.rawScore}</span>
                              {submission.curvedScore}/{submission.maxScore}
                            </p>
                            <p className="text-xs text-success">Curved</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{submission.rawScore}/{submission.maxScore}</p>
                            <p className="text-xs text-muted-foreground">Final</p>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{submission.gradedAt ? formatDate(submission.gradedAt) : ""}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditGradedSubmission(submission); }}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grading Modal */}
      <Modal
        isOpen={selectedSubmission !== null}
        onClose={() => {
          setSelectedSubmission(null);
          setGradeScore("");
          setGradeFeedback("");
        }}
        title={selectedSubmission?.gradedAt ? "Edit Grade" : "Grade Submission"}
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar fallback={selectedSubmission.student.name} size="lg" />
              <div>
                <p className="font-medium text-lg">{selectedSubmission.student.name}</p>
                <p className="text-sm text-muted-foreground">{selectedSubmission.student.email}</p>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="space-y-2">
              <h4 className="font-medium">{selectedSubmission.assignment}</h4>
              <p className="text-sm text-muted-foreground">{selectedSubmission.course}</p>
              <div className="flex gap-4 text-sm">
                <span>Submitted: {selectedSubmission.submittedAt ? formatDate(selectedSubmission.submittedAt) : "Not submitted"}</span>
                {selectedSubmission.dueDate && (
                  <span>Due: {new Date(selectedSubmission.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Submission content + plagiarism check */}
            <SubmissionPreview submissionId={selectedSubmission.id} />

            {/* Previous Grade (when editing) */}
            {selectedSubmission.gradedAt && selectedSubmission.rawScore !== null && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Grade</p>
                      <p className="text-sm text-muted-foreground">
                        Graded on {formatDate(selectedSubmission.gradedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{selectedSubmission.rawScore}</p>
                      <p className="text-sm text-muted-foreground">out of {selectedSubmission.maxScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto Score */}
            {selectedSubmission.autoScore !== null && !selectedSubmission.gradedAt && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Graded Score</p>
                      <p className="text-sm text-muted-foreground">Based on quiz answers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{selectedSubmission.autoScore}</p>
                      <p className="text-sm text-muted-foreground">out of {selectedSubmission.maxScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grading Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Score</Label>
                  <Input
                    type="number"
                    placeholder={`0 - ${selectedSubmission.maxScore}`}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Points</Label>
                  <Input type="number" value={selectedSubmission.maxScore} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Feedback</Label>
                <Textarea
                  placeholder="Provide feedback to the student..."
                  rows={4}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setSelectedSubmission(null);
                setGradeScore("");
                setGradeFeedback("");
              }}>
                Cancel
              </Button>
              {!selectedSubmission.gradedAt && (
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              )}
              <Button onClick={handleGradeSubmit} isLoading={isGrading} disabled={!gradeScore}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectedSubmission.gradedAt ? "Update Grade" : "Submit Grade"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Curve Modal */}
      <Modal
        isOpen={curveModalOpen}
        onClose={() => setCurveModalOpen(false)}
        title="Apply Grade Curve"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Apply a curve to adjust grades for an assignment or entire course.
          </p>

          {curveError && (
            <Alert variant="error" onClose={() => setCurveError(null)}>
              {curveError}
            </Alert>
          )}

          {curveSuccess && (
            <Alert variant="success">
              Curve applied successfully! Grades have been updated.
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Assignment</Label>
              <Select
                options={assignmentOptionsForCurve}
                value={selectedAssignmentForCurve}
                onChange={setSelectedAssignmentForCurve}
              />
              {assignmentOptionsForCurve.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  No graded submissions found. Grade some submissions first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Curve Method</Label>
              <div className="grid gap-2">
                {curveOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      curveMethod === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="curve"
                      value={option.value}
                      checked={curveMethod === option.value}
                      onChange={() => setCurveMethod(option.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {curveMethod === "bell" && (
              <div className="space-y-2">
                <Label>Target Mean (%)</Label>
                <Input
                  type="number"
                  value={curveValue}
                  onChange={(e) => setCurveValue(e.target.value)}
                  placeholder="80"
                />
              </div>
            )}

            {curveMethod === "flat" && (
              <div className="space-y-2">
                <Label>Bonus Points</Label>
                <Input
                  type="number"
                  value={curveValue}
                  onChange={(e) => setCurveValue(e.target.value)}
                  placeholder="5"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {curveMethod !== "none" && curvePreview && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Mean:</span>
                    <span>{curvePreview.stats.originalMean.toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Mean:</span>
                    <span className="text-success font-medium">
                      {curvePreview.stats.newMean.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Median:</span>
                    <span>{curvePreview.stats.originalMedian.toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Median:</span>
                    <span className="text-success font-medium">
                      {curvePreview.stats.newMedian.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Students Affected:</span>
                    <span>{curvePreview.stats.studentsAffected} of {curvePreview.stats.totalStudents}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {curveMethod !== "none" && !curvePreview && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No graded submissions to preview curve.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setCurveModalOpen(false);
              setCurveError(null);
              setCurveSuccess(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCurve}
              isLoading={isApplyingCurve}
              disabled={curveMethod === "none" || !curvePreview || curveSuccess}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Apply Curve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

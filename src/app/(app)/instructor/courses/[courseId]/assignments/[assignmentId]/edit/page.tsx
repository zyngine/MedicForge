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
  Input,
  Label,
  Textarea,
  Select,
  Checkbox,
  Alert,
  Spinner,
  Badge,
} from "@/components/ui";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  CheckCircle,
  Save,
  Eye,
  Plus,
  Library,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { QuizBuilder, useQuizBuilderState, type QuizQuestion, QuizTemplateBrowser, SaveQuizTemplateModal } from "@/components/quiz";
import { useModules } from "@/lib/hooks/use-modules";
import { useAssignment, useUpdateAssignment, useDeleteAssignment } from "@/lib/hooks/use-assignments";
import {
  useQuizQuestions,
  useBulkCreateQuizQuestions,
  useUpdateQuizQuestion,
  useDeleteQuizQuestion
} from "@/lib/hooks/use-quiz-questions";
import { toast } from "sonner";

type AssignmentType = "quiz" | "written" | "skill_checklist";

export default function EditAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;

  // Fetch existing assignment data
  const { data: assignment, isLoading: assignmentLoading } = useAssignment(assignmentId);
  const { data: existingQuestions = [], isLoading: questionsLoading } = useQuizQuestions(assignmentId);

  // Fetch modules for this course
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);

  // Mutations
  const { mutateAsync: updateAssignment, isPending: isUpdating } = useUpdateAssignment();
  const { mutateAsync: deleteAssignment, isPending: isDeleting } = useDeleteAssignment();
  const { mutateAsync: bulkCreateQuestions } = useBulkCreateQuizQuestions();
  const { mutateAsync: updateQuestion } = useUpdateQuizQuestion();
  const { mutateAsync: deleteQuestion } = useDeleteQuizQuestion();

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [moduleId, setModuleId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [availableFrom, setAvailableFrom] = React.useState("");
  const [availableUntil, setAvailableUntil] = React.useState("");
  const [timeLimit, setTimeLimit] = React.useState("");
  const [attempts, setAttempts] = React.useState("1");
  const [shuffleQuestions, setShuffleQuestions] = React.useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = React.useState(true);
  const [isPublished, setIsPublished] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTemplateBrowser, setShowTemplateBrowser] = React.useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Quiz builder state
  const { questions, setQuestions, totalPoints } = useQuizBuilderState([]);

  // Initialize form with existing data
  React.useEffect(() => {
    if (assignment && !isInitialized) {
      setTitle(assignment.title);
      setDescription(assignment.description || "");
      setModuleId(assignment.module_id || "");

      // Parse dates for datetime-local input
      if (assignment.due_date) {
        const dueDateTime = new Date(assignment.due_date);
        setDueDate(dueDateTime.toISOString().slice(0, 16));
      }
      if (assignment.available_from) {
        const availableFromDateTime = new Date(assignment.available_from);
        setAvailableFrom(availableFromDateTime.toISOString().slice(0, 16));
      }

      // Parse settings
      const settings = (assignment.settings || {}) as {
        available_until?: string;
        shuffle_questions?: boolean;
        show_correct_answers?: boolean;
      };
      if (settings.available_until) {
        const availableUntilDateTime = new Date(settings.available_until);
        setAvailableUntil(availableUntilDateTime.toISOString().slice(0, 16));
      }
      setShuffleQuestions(settings.shuffle_questions || false);
      setShowCorrectAnswers(settings.show_correct_answers !== false);

      setTimeLimit(assignment.time_limit_minutes?.toString() || "");
      setAttempts(
        assignment.attempts_allowed && assignment.attempts_allowed >= 999
          ? "unlimited"
          : (assignment.attempts_allowed?.toString() || "1")
      );
      setIsPublished(assignment.is_published || false);

      setIsInitialized(true);
    }
  }, [assignment, isInitialized]);

  // Initialize questions
  React.useEffect(() => {
    if (existingQuestions.length > 0 && questions.length === 0 && isInitialized) {
      const transformedQuestions: QuizQuestion[] = existingQuestions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: (q.question_type || "multiple_choice") as QuizQuestion["question_type"],
        options: (q.options as string[]) || [],
        correct_answer: q.correct_answer as number | string | number[],
        points: q.points || 1,
        explanation: q.explanation || undefined,
      }));
      setQuestions(transformedQuestions);
    }
  }, [existingQuestions, questions.length, isInitialized, setQuestions]);

  // Handle template selection
  const handleTemplateSelect = (template: {
    name: string;
    description: string | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_correct_answers: boolean;
    passing_score: number;
    questions: QuizQuestion[];
    total_points: number;
  }) => {
    setTitle(template.name);
    setDescription(template.description || "");
    setTimeLimit(template.time_limit_minutes?.toString() || "");
    setAttempts(template.max_attempts >= 999 ? "unlimited" : template.max_attempts.toString());
    setShuffleQuestions(template.shuffle_questions);
    setShowCorrectAnswers(template.show_correct_answers);
    setQuestions(template.questions);
  };

  // Module options for select
  const moduleOptions = modules.map((m) => ({
    value: m.id,
    label: m.title,
  }));

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!moduleId) {
      setError("Please select a module");
      return;
    }

    if (assignment?.type === "quiz" && questions.length === 0) {
      setError("Please add at least one question");
      return;
    }

    setError(null);

    try {
      // Update the assignment
      await updateAssignment({
        assignmentId,
        data: {
          title,
          description,
          due_date: dueDate || undefined,
          available_from: availableFrom || undefined,
          points_possible: totalPoints || 100,
          time_limit_minutes: timeLimit ? parseInt(timeLimit) : undefined,
          attempts_allowed: attempts === "unlimited" ? 999 : parseInt(attempts),
          settings: {
            shuffle_questions: shuffleQuestions,
            show_correct_answers: showCorrectAnswers,
            available_until: availableUntil || null,
          },
          is_published: isPublished,
        },
      });

      // If it's a quiz, handle question updates
      if (assignment?.type === "quiz") {
        // Track existing question IDs
        const existingIds = new Set(existingQuestions.map((q) => q.id));
        const currentIds = new Set(questions.map((q) => q.id));

        // Delete removed questions
        for (const existingQ of existingQuestions) {
          if (!currentIds.has(existingQ.id)) {
            await deleteQuestion(existingQ.id);
          }
        }

        // Update existing questions and create new ones
        const newQuestions: QuizQuestion[] = [];

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (existingIds.has(q.id)) {
            // Update existing question
            await updateQuestion({
              questionId: q.id,
              data: {
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options.length > 0 ? q.options : null,
                correct_answer: q.correct_answer,
                points: q.points,
                order_index: i,
                explanation: q.explanation || undefined,
              },
            });
          } else {
            // New question - collect for bulk create
            newQuestions.push({
              ...q,
              id: `new_${i}`, // Will be replaced by DB
            });
          }
        }

        // Bulk create new questions
        if (newQuestions.length > 0) {
          const questionsData = newQuestions.map((q, index) => {
            const originalIndex = questions.findIndex((orig) =>
              orig.question_text === q.question_text &&
              orig.correct_answer === q.correct_answer
            );
            return {
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options.length > 0 ? q.options : null,
              correct_answer: q.correct_answer,
              points: q.points,
              order_index: originalIndex !== -1 ? originalIndex : index,
              explanation: q.explanation || undefined,
            };
          });

          await bulkCreateQuestions({
            assignmentId,
            questions: questionsData,
          });
        }
      }

      toast.success("Assignment updated successfully");
      router.push(`/instructor/courses/${courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAssignment(assignmentId);
      toast.success("Assignment deleted");
      router.push(`/instructor/courses/${courseId}`);
    } catch (err) {
      toast.error("Failed to delete assignment");
    }
  };

  const isLoading = assignmentLoading || questionsLoading || modulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="text-xl font-semibold">Assignment not found</h2>
        <Button asChild>
          <Link href={`/instructor/courses/${courseId}`}>Back to Course</Link>
        </Button>
      </div>
    );
  }

  const assignmentType = assignment.type as AssignmentType;
  const assignmentTypeLabel = {
    quiz: "Quiz",
    written: "Written Assignment",
    skill_checklist: "Skill Checklist",
  }[assignmentType] || "Assignment";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/instructor/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Edit {assignmentTypeLabel}</h1>
              {!isPublished && (
                <Badge variant="secondary">Draft</Badge>
              )}
              {isPublished && (
                <Badge variant="success">Published</Badge>
              )}
            </div>
            <p className="text-muted-foreground">Update assignment details and questions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" disabled>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} isLoading={isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Alert variant="error">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Are you sure you want to delete this assignment?</p>
              <p className="text-sm text-muted-foreground">
                This will also delete all student submissions. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>Basic information about this assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Module 3 Quiz - Patient Assessment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description / Instructions</Label>
                <Textarea
                  id="description"
                  placeholder="Provide instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="module" required>Module</Label>
                  <Select
                    id="module"
                    options={moduleOptions}
                    value={moduleId}
                    onChange={setModuleId}
                    placeholder="Select a module"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Total Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={assignmentType === "quiz" ? totalPoints : 100}
                    disabled={assignmentType === "quiz"}
                    readOnly={assignmentType === "quiz"}
                  />
                  {assignmentType === "quiz" && (
                    <p className="text-xs text-muted-foreground">
                      Calculated from questions
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Questions */}
          {assignmentType === "quiz" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>
                      Edit your quiz questions below
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateBrowser(true)}
                    >
                      <Library className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                    {questions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSaveTemplate(true)}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save as Template
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <QuizBuilder
                  questions={questions}
                  onChange={setQuestions}
                />
              </CardContent>
            </Card>
          )}

          {/* Written Assignment */}
          {assignmentType === "written" && (
            <Card>
              <CardHeader>
                <CardTitle>Submission Requirements</CardTitle>
                <CardDescription>Configure what students need to submit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Checkbox
                    id="allowText"
                    label="Allow text submission"
                    defaultChecked
                  />
                </div>
                <div className="space-y-2">
                  <Checkbox
                    id="allowFile"
                    label="Allow file upload"
                    defaultChecked
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accepted file types</Label>
                  <Input placeholder=".pdf, .doc, .docx" />
                </div>
                <div className="space-y-2">
                  <Label>Maximum file size (MB)</Label>
                  <Input type="number" placeholder="10" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skill Checklist */}
          {assignmentType === "skill_checklist" && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Steps</CardTitle>
                <CardDescription>Define the steps students must complete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Add the steps that students must demonstrate for this skill.
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {assignmentType === "quiz" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      placeholder="No limit"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attempts">Attempts Allowed</Label>
                    <Select
                      id="attempts"
                      options={[
                        { value: "1", label: "1 attempt" },
                        { value: "2", label: "2 attempts" },
                        { value: "3", label: "3 attempts" },
                        { value: "unlimited", label: "Unlimited" },
                      ]}
                      value={attempts}
                      onChange={setAttempts}
                    />
                  </div>
                  <div className="pt-4 border-t space-y-3">
                    <Checkbox
                      id="shuffle"
                      label="Shuffle question order"
                      checked={shuffleQuestions}
                      onChange={(checked) => setShuffleQuestions(checked)}
                    />
                    <Checkbox
                      id="showAnswers"
                      label="Show correct answers after submission"
                      checked={showCorrectAnswers}
                      onChange={(checked) => setShowCorrectAnswers(checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="availableFrom">Available From</Label>
                <Input
                  id="availableFrom"
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUntil">Available Until</Label>
                <Input
                  id="availableUntil"
                  type="datetime-local"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <Checkbox
                  id="publish"
                  label="Published"
                  checked={isPublished}
                  onChange={(checked) => setIsPublished(checked)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Students can only see published assignments
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quiz Template Browser Modal */}
      <QuizTemplateBrowser
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Save as Template Modal */}
      <SaveQuizTemplateModal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        questions={questions}
        quizSettings={{
          time_limit_minutes: timeLimit ? parseInt(timeLimit) : undefined,
          max_attempts: attempts === "unlimited" ? 999 : parseInt(attempts),
          shuffle_questions: shuffleQuestions,
          show_correct_answers: showCorrectAnswers,
        }}
        defaultName={title}
      />
    </div>
  );
}

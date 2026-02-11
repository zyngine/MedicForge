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
} from "lucide-react";
import { QuizBuilder, useQuizBuilderState, type QuizQuestion, QuizTemplateBrowser, SaveQuizTemplateModal } from "@/components/quiz";
import { useModules } from "@/lib/hooks/use-modules";
import { useCreateAssignment } from "@/lib/hooks/use-assignments";
import { useBulkCreateQuizQuestions } from "@/lib/hooks/use-quiz-questions";

type AssignmentType = "quiz" | "written" | "skill_checklist";

const assignmentTypes = [
  { value: "quiz", label: "Quiz", icon: <ClipboardCheck className="h-5 w-5" />, description: "Multiple choice, true/false, matching questions" },
  { value: "written", label: "Written Assignment", icon: <FileText className="h-5 w-5" />, description: "Essays, short answers, file uploads" },
  { value: "skill_checklist", label: "Skill Checklist", icon: <CheckCircle className="h-5 w-5" />, description: "Hands-on skill evaluation" },
];

export default function NewAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  // Fetch modules for this course
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);
  const { mutateAsync: createAssignment, isPending: isCreating } = useCreateAssignment();
  const { mutateAsync: bulkCreateQuestions } = useBulkCreateQuizQuestions();

  const [assignmentType, setAssignmentType] = React.useState<AssignmentType | null>(null);
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
  const [publishImmediately, setPublishImmediately] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showTemplateBrowser, setShowTemplateBrowser] = React.useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = React.useState(false);

  // Quiz builder state
  const { questions, setQuestions, totalPoints } = useQuizBuilderState([]);

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
    // Populate form with template data
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

    if (assignmentType === "quiz" && questions.length === 0) {
      setError("Please add at least one question");
      return;
    }

    setError(null);

    try {
      // Create the assignment
      const assignment = await createAssignment({
        moduleId,
        data: {
          title,
          description,
          type: assignmentType || "quiz",
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
          is_published: publishImmediately,
        },
      });

      // If it's a quiz, create the questions
      if (assignmentType === "quiz" && questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.length > 0 ? q.options : null,
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: index,
          explanation: q.explanation || undefined,
        }));

        await bulkCreateQuestions({
          assignmentId: assignment.id,
          questions: questionsData,
        });
      }

      // Navigate back to course
      router.push(`/instructor/courses/${courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
    }
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!assignmentType) {
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

        <div>
          <h1 className="text-2xl font-bold">Create New Assignment</h1>
          <p className="text-muted-foreground">Choose the type of assignment you want to create</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {assignmentTypes.map((type) => (
            <Card
              key={type.value}
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
              onClick={() => setAssignmentType(type.value as AssignmentType)}
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                  {type.icon}
                </div>
                <h3 className="font-semibold mb-2">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setAssignmentType(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Create {assignmentTypes.find((t) => t.value === assignmentType)?.label}
            </h1>
            <p className="text-muted-foreground">Fill in the details below</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} isLoading={isCreating}>
            <Save className="h-4 w-4 mr-2" />
            Save Assignment
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
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
                      Build your quiz by adding questions below
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
                  label="Publish immediately"
                  checked={publishImmediately}
                  onChange={(checked) => setPublishImmediately(checked)}
                />
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

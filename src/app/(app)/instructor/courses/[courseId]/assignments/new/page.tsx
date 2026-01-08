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
} from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ClipboardCheck,
  FileText,
  CheckCircle,
  HelpCircle,
  Save,
  Eye,
} from "lucide-react";

type AssignmentType = "quiz" | "written" | "skill_checklist";
type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "matching";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  options: string[];
  correctAnswer: number | string;
  explanation?: string;
}

const assignmentTypes = [
  { value: "quiz", label: "Quiz", icon: <ClipboardCheck className="h-5 w-5" />, description: "Multiple choice, true/false, matching questions" },
  { value: "written", label: "Written Assignment", icon: <FileText className="h-5 w-5" />, description: "Essays, short answers, file uploads" },
  { value: "skill_checklist", label: "Skill Checklist", icon: <CheckCircle className="h-5 w-5" />, description: "Hands-on skill evaluation" },
];

const questionTypes = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
];

const moduleOptions = [
  { value: "1", label: "Module 1: Introduction to EMS" },
  { value: "2", label: "Module 2: Medical, Legal, and Ethical Issues" },
  { value: "3", label: "Module 3: Patient Assessment" },
  { value: "4", label: "Module 4: Airway Management" },
  { value: "5", label: "Module 5: Cardiac Emergencies" },
];

export default function NewAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [assignmentType, setAssignmentType] = React.useState<AssignmentType | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [moduleId, setModuleId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [points, setPoints] = React.useState("100");
  const [timeLimit, setTimeLimit] = React.useState("");
  const [attempts, setAttempts] = React.useState("1");
  const [shuffleQuestions, setShuffleQuestions] = React.useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = React.useState(true);

  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      type,
      text: "",
      points: 10,
      options: type === "multiple_choice" ? ["", "", "", ""] : type === "true_false" ? ["True", "False"] : [],
      correctAnswer: type === "true_false" ? 0 : "",
      explanation: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options.length < 6) {
          return { ...q, options: [...q.options, ""] };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options.length > 2) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

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
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Assignment
          </Button>
        </div>
      </div>

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
                  <Label htmlFor="module">Module</Label>
                  <Select
                    id="module"
                    options={moduleOptions}
                    value={moduleId}
                    onChange={setModuleId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Total Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Questions */}
          {assignmentType === "quiz" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    {questions.length} question{questions.length !== 1 ? "s" : ""} -{" "}
                    {questions.reduce((sum, q) => sum + q.points, 0)} points total
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    options={questionTypes}
                    value=""
                    onChange={(value) => addQuestion(value as QuestionType)}
                    placeholder="Add Question"
                    className="w-[180px]"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No questions yet. Add your first question above.</p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")}>
                        <Plus className="h-4 w-4 mr-1" />
                        Multiple Choice
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addQuestion("true_false")}>
                        <Plus className="h-4 w-4 mr-1" />
                        True/False
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {questions.map((question, index) => (
                      <div key={question.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="cursor-move text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Question {index + 1}</span>
                                <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                  {questionTypes.find((t) => t.value === question.type)?.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={question.points}
                                  onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">pts</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQuestion(question.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <Textarea
                              placeholder="Enter your question..."
                              value={question.text}
                              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                              rows={2}
                            />

                            {/* Multiple Choice Options */}
                            {question.type === "multiple_choice" && (
                              <div className="space-y-2">
                                <Label>Answer Options</Label>
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${question.id}`}
                                      checked={question.correctAnswer === optIndex}
                                      onChange={() => updateQuestion(question.id, { correctAnswer: optIndex })}
                                      className="h-4 w-4"
                                    />
                                    <Input
                                      placeholder={`Option ${optIndex + 1}`}
                                      value={option}
                                      onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                    />
                                    {question.options.length > 2 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(question.id, optIndex)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {question.options.length < 6 && (
                                  <Button variant="ghost" size="sm" onClick={() => addOption(question.id)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Option
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* True/False Options */}
                            {question.type === "true_false" && (
                              <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${question.id}`}
                                      checked={question.correctAnswer === 0}
                                      onChange={() => updateQuestion(question.id, { correctAnswer: 0 })}
                                    />
                                    True
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${question.id}`}
                                      checked={question.correctAnswer === 1}
                                      onChange={() => updateQuestion(question.id, { correctAnswer: 1 })}
                                    />
                                    False
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Short Answer */}
                            {question.type === "short_answer" && (
                              <div className="space-y-2">
                                <Label>Expected Answer (for reference)</Label>
                                <Textarea
                                  placeholder="Enter the expected answer..."
                                  value={question.correctAnswer as string}
                                  onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                                  rows={2}
                                />
                              </div>
                            )}

                            {/* Explanation */}
                            <div className="space-y-2">
                              <Label>Explanation (shown after submission)</Label>
                              <Textarea
                                placeholder="Explain why this is the correct answer..."
                                value={question.explanation}
                                onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUntil">Available Until</Label>
                <Input
                  id="availableUntil"
                  type="datetime-local"
                />
              </div>
              <div className="pt-4">
                <Checkbox
                  id="publish"
                  label="Publish immediately"
                  defaultChecked
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

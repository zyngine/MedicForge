"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Badge,
  Alert,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Circle,
  ChevronUp,
  ChevronDown,
  Copy,
  Save,
  HelpCircle,
} from "lucide-react";

export type QuestionType = "multiple_choice" | "true_false" | "matching" | "short_answer";

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: number | string | number[];
  points: number;
  explanation?: string;
}

interface QuizBuilderProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  readOnly?: boolean;
}

const questionTypeOptions = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
];

const generateId = () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function QuizBuilder({ questions, onChange, readOnly = false }: QuizBuilderProps) {
  const [expandedQuestions, setExpandedQuestions] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addQuestion = (type: QuestionType = "multiple_choice") => {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      question_text: "",
      question_type: type,
      options: type === "true_false" ? ["True", "False"] : ["", "", "", ""],
      correct_answer: type === "true_false" ? 0 : 0,
      points: 1,
      explanation: "",
    };
    onChange([...questions, newQuestion]);
    setExpandedQuestions((prev) => new Set(prev).add(newQuestion.id));
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const deleteQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateQuestion = (question: QuizQuestion) => {
    const newQuestion = {
      ...question,
      id: generateId(),
      question_text: `${question.question_text} (Copy)`,
    };
    const index = questions.findIndex((q) => q.id === question.id);
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, newQuestion);
    onChange(newQuestions);
    setExpandedQuestions((prev) => new Set(prev).add(newQuestion.id));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    onChange(newQuestions);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {questions.length} Question{questions.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="info" className="text-sm">
            {totalPoints} Total Points
          </Badge>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")}>
              <Plus className="h-4 w-4 mr-1" />
              Multiple Choice
            </Button>
            <Button variant="outline" size="sm" onClick={() => addQuestion("true_false")}>
              <Plus className="h-4 w-4 mr-1" />
              True/False
            </Button>
            <Button variant="outline" size="sm" onClick={() => addQuestion("short_answer")}>
              <Plus className="h-4 w-4 mr-1" />
              Short Answer
            </Button>
          </div>
        )}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-4">
              Add questions to build your quiz
            </p>
            {!readOnly && (
              <Button onClick={() => addQuestion("multiple_choice")}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedQuestions.has(question.id)}
              onToggle={() => toggleExpanded(question.id)}
              onChange={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
              onDuplicate={() => duplicateQuestion(question)}
              onMoveUp={() => moveQuestion(index, "up")}
              onMoveDown={() => moveQuestion(index, "down")}
              canMoveUp={index > 0}
              canMoveDown={index < questions.length - 1}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  readOnly: boolean;
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  readOnly,
}: QuestionEditorProps) {
  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onChange({ options: newOptions });
  };

  const addOption = () => {
    onChange({ options: [...question.options, ""] });
  };

  const removeOption = (optionIndex: number) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    // Adjust correct answer if needed
    let newCorrectAnswer = question.correct_answer;
    if (typeof newCorrectAnswer === "number") {
      if (newCorrectAnswer === optionIndex) {
        newCorrectAnswer = 0;
      } else if (newCorrectAnswer > optionIndex) {
        newCorrectAnswer = newCorrectAnswer - 1;
      }
    }
    onChange({ options: newOptions, correct_answer: newCorrectAnswer });
  };

  const handleTypeChange = (newType: QuestionType) => {
    let newOptions = question.options;
    let newCorrectAnswer: number | string = question.correct_answer as number;

    if (newType === "true_false") {
      newOptions = ["True", "False"];
      newCorrectAnswer = 0;
    } else if (newType === "short_answer") {
      newOptions = [];
      newCorrectAnswer = "";
    } else if (question.question_type === "true_false" || question.question_type === "short_answer") {
      newOptions = ["", "", "", ""];
      newCorrectAnswer = 0;
    }

    onChange({
      question_type: newType,
      options: newOptions,
      correct_answer: newCorrectAnswer,
    });
  };

  const questionTypeLabel = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    short_answer: "Short Answer",
    matching: "Matching",
  }[question.question_type];

  return (
    <Card className={isExpanded ? "ring-2 ring-primary/20" : ""}>
      <CardHeader className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4">
          {!readOnly && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={!canMoveUp}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={!canMoveDown}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                Q{index + 1}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {questionTypeLabel}
              </Badge>
              <Badge variant="info" className="text-xs">
                {question.points} pt{question.points !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate">
              {question.question_text || "Untitled question"}
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-error" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 pt-0 space-y-4 border-t">
          {/* Question Type & Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                options={questionTypeOptions}
                value={question.question_type}
                onChange={(val) => handleTypeChange(val as QuestionType)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                value={question.points}
                onChange={(e) => onChange({ points: parseInt(e.target.value) || 1 })}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label required>Question</Label>
            <Textarea
              value={question.question_text}
              onChange={(e) => onChange({ question_text: e.target.value })}
              placeholder="Enter your question here..."
              rows={3}
              disabled={readOnly}
            />
          </div>

          {/* Answer Options */}
          {question.question_type === "multiple_choice" && (
            <div className="space-y-3">
              <Label>Answer Options</Label>
              <p className="text-xs text-muted-foreground">
                Click the circle to mark the correct answer
              </p>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !readOnly && onChange({ correct_answer: optionIndex })}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      question.correct_answer === optionIndex
                        ? "border-success bg-success text-white"
                        : "border-muted hover:border-primary"
                    }`}
                    disabled={readOnly}
                  >
                    {question.correct_answer === optionIndex && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                    placeholder={`Option ${optionIndex + 1}`}
                    disabled={readOnly}
                  />
                  {!readOnly && question.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(optionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!readOnly && question.options.length < 6 && (
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {question.question_type === "true_false" && (
            <div className="space-y-3">
              <Label>Correct Answer</Label>
              <div className="flex gap-4">
                {["True", "False"].map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => !readOnly && onChange({ correct_answer: optionIndex })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      question.correct_answer === optionIndex
                        ? "border-success bg-success/10 text-success"
                        : "border-muted hover:border-primary"
                    }`}
                    disabled={readOnly}
                  >
                    {question.correct_answer === optionIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {question.question_type === "short_answer" && (
            <div className="space-y-2">
              <Label>Expected Answer</Label>
              <Input
                value={question.correct_answer as string}
                onChange={(e) => onChange({ correct_answer: e.target.value })}
                placeholder="Enter the expected answer..."
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">
                Student answers will be compared to this (case-insensitive)
              </p>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Textarea
              value={question.explanation || ""}
              onChange={(e) => onChange({ explanation: e.target.value })}
              placeholder="Explain why this is the correct answer..."
              rows={2}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              Shown to students after quiz submission
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Export a simpler hook-integrated version
export function useQuizBuilderState(initialQuestions: QuizQuestion[] = []) {
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(initialQuestions);

  const reset = (newQuestions: QuizQuestion[] = []) => {
    setQuestions(newQuestions);
  };

  const toFormData = () => {
    return questions.map((q, index) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options.length > 0 ? q.options : null,
      correct_answer: q.correct_answer,
      points: q.points,
      order_index: index,
      explanation: q.explanation || null,
    }));
  };

  return {
    questions,
    setQuestions,
    reset,
    toFormData,
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    questionCount: questions.length,
  };
}

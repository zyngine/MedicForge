"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Progress,
  Modal,
  ModalFooter,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  Brain,
  Target,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import {
  useExamSession,
  useStartExamAttempt,
  type StandardizedQuestion,
} from "@/lib/hooks/use-standardized-exams";
import { createIntegrityTracker, type IntegrityTracker, type IntegrityEvent } from "@/lib/integrity-tracker";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";

interface ExamPlayerProps {
  templateId: string;
  courseId?: string;
  existingAttemptId?: string;
  onComplete?: (attemptId: string) => void;
}

export function ExamPlayer({
  templateId,
  courseId,
  existingAttemptId,
  onComplete,
}: ExamPlayerProps) {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user } = useUser();
  const { startAttempt, isStarting } = useStartExamAttempt();
  const [attemptId, setAttemptId] = React.useState<string | undefined>(existingAttemptId);
  const [showStartScreen, setShowStartScreen] = React.useState(!existingAttemptId);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);

  const {
    attempt,
    currentQuestion,
    responses,
    isLoading,
    isSubmitting,
    submitResponse,
    abandonExam,
    questionsRemaining,
  } = useExamSession(attemptId);

  const [selectedAnswer, setSelectedAnswer] = React.useState<unknown>(null);
  const [questionStartTime, setQuestionStartTime] = React.useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<Set<string>>(new Set());

  // Integrity tracking state
  const integrityTrackerRef = React.useRef<IntegrityTracker | null>(null);
  const [integrityWarning, setIntegrityWarning] = React.useState<string | null>(null);
  const [_integrityEventCount, setIntegrityEventCount] = React.useState(0);

  // Initialize integrity tracker when exam starts
  React.useEffect(() => {
    if (!attemptId || !tenant?.id || !user?.id || attempt?.status !== "in_progress") return;

    // Check if integrity monitoring is enabled for this exam
    // Cast to any since integrity fields may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = attempt?.template as any;
    const monitoringEnabled = template?.integrity_monitoring_enabled !== false;
    if (!monitoringEnabled) return;

    // Create and initialize tracker
    const tracker = createIntegrityTracker({
      attemptId,
      tenantId: tenant.id,
      userId: user.id,
      preventCopyPaste: template?.prevent_copy_paste || false,
      blockRightClick: template?.block_right_click || false,
      warnOnBlur: template?.warn_on_blur !== false,
      onEvent: (_event: IntegrityEvent) => {
        setIntegrityEventCount((prev) => prev + 1);
      },
      onWarning: (message: string) => {
        setIntegrityWarning(message);
        // Auto-dismiss after 5 seconds
        setTimeout(() => setIntegrityWarning(null), 5000);
      },
    });

    integrityTrackerRef.current = tracker;

    // Cleanup on unmount or exam complete
    return () => {
      tracker.destroy();
      integrityTrackerRef.current = null;
    };
  }, [attemptId, tenant?.id, user?.id, attempt?.status, attempt?.template]);

  // Update current question in tracker
  React.useEffect(() => {
    if (integrityTrackerRef.current && currentQuestion) {
      integrityTrackerRef.current.setCurrentQuestion(
        currentQuestion.id,
        attempt?.questions_answered ? attempt.questions_answered + 1 : 1
      );
    }
  }, [currentQuestion?.id, attempt?.questions_answered]);

  // Timer effect
  React.useEffect(() => {
    if (!attempt?.template?.time_limit_minutes || attempt.status !== "in_progress") return;

    const startTime = new Date(attempt.started_at).getTime();
    const endTime = startTime + attempt.template.time_limit_minutes * 60 * 1000;

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Time's up - auto submit
        handleTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt?.started_at, attempt?.template?.time_limit_minutes, attempt?.status]);

  // Reset question start time when question changes
  React.useEffect(() => {
    setQuestionStartTime(Date.now());
    setSelectedAnswer(null);
  }, [currentQuestion?.id]);

  const handleStart = async () => {
    const result = await startAttempt(templateId, courseId);
    if (result) {
      setAttemptId(result.attempt.id);
      setShowStartScreen(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || selectedAnswer === null) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const result = await submitResponse(currentQuestion.id, selectedAnswer, timeSpent);

    if (result?.isComplete) {
      // Flush integrity events before navigating away
      await integrityTrackerRef.current?.flush();
      onComplete?.(attempt!.id);
      router.push(`/student/exams/${attempt!.id}/results`);
    }
  };

  const handleTimeUp = async () => {
    if (attempt) {
      await integrityTrackerRef.current?.flush();
      await abandonExam();
      router.push(`/student/exams/${attempt.id}/results`);
    }
  };

  const handleExit = async () => {
    await integrityTrackerRef.current?.flush();
    await abandonExam();
    router.push("/student/exams");
  };

  const toggleFlag = () => {
    if (!currentQuestion) return;
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  // Format time remaining
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Start screen
  if (showStartScreen) {
    return <ExamStartScreen templateId={templateId} onStart={handleStart} isStarting={isStarting} />;
  }

  // Loading state
  if (isLoading || !attempt) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Exam completed
  if (attempt.status === "completed" || attempt.status === "abandoned") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          {attempt.status === "completed" ? (
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          ) : (
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {attempt.status === "completed" ? "Exam Completed" : "Exam Ended"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {attempt.status === "completed"
              ? "Your exam has been submitted successfully."
              : "This exam session has ended."}
          </p>
          <Button onClick={() => router.push(`/student/exams/${attempt.id}/results`)}>
            View Results
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No more questions (shouldn't happen normally)
  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No More Questions</h2>
          <p className="text-muted-foreground mb-6">
            There are no more questions available. Your exam may be complete.
          </p>
          <Button onClick={() => router.push(`/student/exams/${attempt.id}/results`)}>
            View Results
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCAT = attempt.template?.exam_type === "cat";
  const progress = isCAT
    ? (attempt.questions_answered / (attempt.template?.cat_config?.max_questions || 50)) * 100
    : (attempt.questions_answered / (attempt.template?.total_questions || 100)) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Integrity Warning Banner */}
      {integrityWarning && (
        <Alert variant="warning" className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span>{integrityWarning}</span>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isCAT ? (
                  <Brain className="h-5 w-5 text-purple-500" />
                ) : (
                  <BookOpen className="h-5 w-5 text-blue-500" />
                )}
                <span className="font-medium">{attempt.template?.name}</span>
              </div>
              <Badge variant="secondary">
                Question {attempt.questions_answered + 1}
                {!isCAT && ` of ${attempt.template?.total_questions}`}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 ${timeRemaining < 300000 ? "text-red-500" : "text-muted-foreground"}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                </div>
              )}

              {/* CAT Indicator */}
              {isCAT && attempt.current_theta !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Ability: {(attempt.current_theta * 100).toFixed(0)}</span>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => setShowExitConfirm(true)}>
                Exit Exam
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{attempt.questions_answered} answered</span>
              {questionsRemaining !== null && <span>{questionsRemaining} remaining</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardContent className="p-6">
          {/* Question Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              {currentQuestion.difficulty && (
                <Badge
                  variant={
                    currentQuestion.difficulty === "easy"
                      ? "success"
                      : currentQuestion.difficulty === "hard" || currentQuestion.difficulty === "expert"
                      ? "destructive"
                      : "warning"
                  }
                >
                  {currentQuestion.difficulty}
                </Badge>
              )}
              {currentQuestion.category && (
                <Badge variant="outline">{currentQuestion.category}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFlag}
              className={flaggedQuestions.has(currentQuestion.id) ? "text-yellow-500" : ""}
            >
              <Flag className="h-4 w-4 mr-1" />
              {flaggedQuestions.has(currentQuestion.id) ? "Flagged" : "Flag"}
            </Button>
          </div>

          {/* Question Text */}
          <div className="mb-8">
            <p className="text-lg leading-relaxed">{currentQuestion.question_text}</p>
          </div>

          {/* Answer Options */}
          <QuestionAnswerInput
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelect={setSelectedAnswer}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isCAT
                ? "Adaptive testing adjusts difficulty based on your performance."
                : `${responses.length} of ${attempt.template?.total_questions} questions answered`}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="mr-2" />
                ) : null}
                {isCAT ? "Submit & Next" : "Next Question"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Exit Exam?"
        size="sm"
      >
        <p className="text-muted-foreground">
          Are you sure you want to exit? Your progress will be saved, but you may not be able to continue
          if you&apos;ve reached your attempt limit.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
            Continue Exam
          </Button>
          <Button variant="destructive" onClick={handleExit}>
            Exit Exam
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface QuestionAnswerInputProps {
  question: StandardizedQuestion;
  selectedAnswer: unknown;
  onSelect: (answer: unknown) => void;
}

function QuestionAnswerInput({ question, selectedAnswer, onSelect }: QuestionAnswerInputProps) {
  if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
    const options = question.options || [];

    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = (selectedAnswer as { id?: string; index?: number })?.id === option.id ||
                            (selectedAnswer as { index?: number })?.index === index;

          return (
            <button
              key={option.id || index}
              onClick={() => onSelect({ id: option.id, index })}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                }`}>
                  {isSelected && <CheckCircle className="h-4 w-4" />}
                </div>
                <span className="flex-1">{option.text}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.question_type === "short_answer") {
    return (
      <div>
        <textarea
          value={(selectedAnswer as string) || ""}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full p-4 border rounded-lg min-h-[150px] resize-y"
        />
      </div>
    );
  }

  return (
    <div className="text-muted-foreground text-center py-8">
      Unsupported question type: {question.question_type}
    </div>
  );
}

interface ExamStartScreenProps {
  templateId: string;
  onStart: () => void;
  isStarting: boolean;
}

function ExamStartScreen({ templateId, onStart, isStarting }: ExamStartScreenProps) {
  const { templates } = useExamTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  const isCAT = template.exam_type === "cat";

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-full mb-4 ${isCAT ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
            {isCAT ? (
              <Brain className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            ) : (
              <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{template.name}</h1>
          {template.description && (
            <p className="text-muted-foreground">{template.description}</p>
          )}
        </div>

        {/* Exam Details */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Questions</p>
            <p className="text-2xl font-bold">
              {isCAT
                ? `${template.cat_config?.min_questions}-${template.cat_config?.max_questions}`
                : template.total_questions}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Time Limit</p>
            <p className="text-2xl font-bold">
              {template.time_limit_minutes ? `${template.time_limit_minutes} min` : "None"}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Passing Score</p>
            <p className="text-2xl font-bold">{template.passing_score}%</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Attempts</p>
            <p className="text-2xl font-bold">
              {template.max_attempts ? `${template.max_attempts} max` : "Unlimited"}
            </p>
          </div>
        </div>

        {/* CAT Info */}
        {isCAT && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                  Computer Adaptive Test (CAT)
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  This exam adapts to your ability level. Questions will get harder when you answer correctly
                  and easier when you answer incorrectly. The exam ends when your ability level is determined
                  with sufficient precision.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="space-y-3 mb-8">
          <h3 className="font-medium">Before you begin:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Make sure you have a stable internet connection
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Find a quiet environment free from distractions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {template.time_limit_minutes
                ? `Set aside at least ${template.time_limit_minutes} minutes`
                : "Take your time - there is no time limit"}
            </li>
            {!template.allow_review && (
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                You cannot go back to previous questions
              </li>
            )}
          </ul>
        </div>

        {/* Start Button */}
        <Button onClick={onStart} disabled={isStarting} className="w-full" size="lg">
          {isStarting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Starting...
            </>
          ) : (
            <>
              Start Exam
              <ChevronRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Need to import this for the start screen
import { useExamTemplates } from "@/lib/hooks/use-standardized-exams";

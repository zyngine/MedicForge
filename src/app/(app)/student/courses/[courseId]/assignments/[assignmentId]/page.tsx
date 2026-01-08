"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Alert,
  Spinner,
  Badge,
} from "@/components/ui";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "matching" | "short_answer" | null;
  options: string[];
  points: number | null;
  order_index: number | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  type: "quiz" | "written" | "skill_checklist" | "discussion" | null;
  points_possible: number | null;
  time_limit_minutes: number | null;
  attempts_allowed: number | null;
  due_date: string | null;
}

interface Submission {
  id: string;
  attempt_number: number | null;
  status: string | null;
  final_score: number | null;
  submitted_at: string | null;
}

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previousSubmissions, setPreviousSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  // Timer effect
  useEffect(() => {
    if (!isStarted || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, timeRemaining]);

  const fetchAssignment = async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch questions if it's a quiz
      if (assignmentData.type === "quiz") {
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("assignment_id", assignmentId)
          .order("order_index");

        if (questionsData) {
          setQuestions(
            questionsData.map((q) => ({
              ...q,
              options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
            }))
          );
        }
      }

      // Fetch previous submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false });

      if (submissionsData) {
        setPreviousSubmissions(submissionsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setIsStarted(true);
    if (assignment?.time_limit_minutes) {
      setTimeRemaining(assignment.time_limit_minutes * 60);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!assignment) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Get user's tenant
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      // Calculate score for quiz
      let score = 0;
      let totalPoints = 0;

      if (assignment.type === "quiz") {
        for (const question of questions) {
          const questionPoints = question.points ?? 0;
          totalPoints += questionPoints;
          const userAnswer = answers[question.id];

          // Fetch correct answer
          const { data: questionData } = await supabase
            .from("quiz_questions")
            .select("correct_answer")
            .eq("id", question.id)
            .single();

          if (questionData) {
            const correctAnswer = typeof questionData.correct_answer === "string"
              ? JSON.parse(questionData.correct_answer)
              : questionData.correct_answer;

            if (userAnswer === correctAnswer) {
              score += questionPoints;
            }
          }
        }
      }

      const attemptNumber = previousSubmissions.length + 1;

      // Create submission
      const { error: submitError } = await supabase.from("submissions").insert({
        tenant_id: profile.tenant_id,
        assignment_id: assignmentId,
        student_id: user.id,
        attempt_number: attemptNumber,
        content: JSON.stringify({ answers }),
        submitted_at: new Date().toISOString(),
        status: assignment.type === "quiz" ? "graded" : "submitted",
        raw_score: assignment.type === "quiz" ? score : null,
        final_score: assignment.type === "quiz" ? score : null,
      });

      if (submitError) throw submitError;

      if (assignment.type === "quiz") {
        setSubmissionResult({
          score,
          total: totalPoints,
          percentage: Math.round((score / totalPoints) * 100),
        });
      }

      setIsStarted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
      </Alert>
    );
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  // Show results after submission
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
              submissionResult.percentage >= 70 ? "bg-success/20" : "bg-warning/20"
            }`}>
              {submissionResult.percentage >= 70 ? (
                <CheckCircle className="h-10 w-10 text-success" />
              ) : (
                <AlertCircle className="h-10 w-10 text-warning" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
            <p className="text-muted-foreground mb-4">
              You scored {submissionResult.score} out of {submissionResult.total} points
            </p>
            <div className="text-4xl font-bold mb-6">
              {submissionResult.percentage}%
            </div>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>
              {previousSubmissions.length < (assignment.attempts_allowed || 1) && (
                <Button onClick={() => {
                  setSubmissionResult(null);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                  fetchAssignment();
                }}>
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz in progress
  if (isStarted && assignment.type === "quiz") {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Timer & Progress */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          {timeRemaining !== null && (
            <Badge variant={timeRemaining < 60 ? "destructive" : "secondary"} className="text-lg px-4 py-1">
              <Clock className="h-4 w-4 mr-2" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{currentQuestion.points} points</Badge>
            </div>
            <CardTitle className="text-xl mt-4">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id] === index
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion.id] === index
                        ? "border-primary bg-primary text-white"
                        : "border-muted"
                    }`}>
                      {answers[currentQuestion.id] === index && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    currentQuestionIndex === index
                      ? "bg-primary text-white"
                      : answers[q.id] !== undefined
                      ? "bg-success/20 text-success"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-quiz screen
  const canAttempt = previousSubmissions.length < (assignment.attempts_allowed ?? 1);
  const lastSubmission = previousSubmissions[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Course
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge>{assignment.type}</Badge>
            {assignment.due_date && (
              <span className="text-sm text-muted-foreground">
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <CardTitle className="text-2xl mt-2">{assignment.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {assignment.description && (
            <p className="text-muted-foreground">{assignment.description}</p>
          )}

          {assignment.instructions && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Instructions</h4>
              <p className="text-sm text-muted-foreground">{assignment.instructions}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Points</p>
              <p className="text-xl font-semibold">{assignment.points_possible}</p>
            </div>
            {assignment.time_limit_minutes && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Time Limit</p>
                <p className="text-xl font-semibold">{assignment.time_limit_minutes} min</p>
              </div>
            )}
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Attempts</p>
              <p className="text-xl font-semibold">
                {previousSubmissions.length} / {assignment.attempts_allowed || 1}
              </p>
            </div>
            {assignment.type === "quiz" && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-xl font-semibold">{questions.length}</p>
              </div>
            )}
          </div>

          {/* Previous attempts */}
          {previousSubmissions.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Previous Attempts</h4>
              <div className="space-y-2">
                {previousSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium">Attempt {sub.attempt_number}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {sub.submitted_at && new Date(sub.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    {sub.final_score !== null && (
                      <Badge variant={sub.final_score >= 70 ? "success" : "warning"}>
                        {sub.final_score}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canAttempt ? (
            <Button className="w-full" size="lg" onClick={handleStartQuiz}>
              {previousSubmissions.length > 0 ? "Retake Quiz" : "Start Quiz"}
            </Button>
          ) : (
            <Alert>
              You have used all available attempts for this assignment.
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

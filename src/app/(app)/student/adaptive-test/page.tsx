"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, Badge } from "@/components/ui";
import {
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Play,
  ArrowRight,
  BarChart,
} from "lucide-react";
import { useAdaptiveTesting } from "@/lib/hooks/use-adaptive-testing";

export default function AdaptiveTestPage() {
  const [testStarted, setTestStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    session,
    currentQuestion,
    isLoading,
    startSession,
    submitAnswer,
    getProgress,
    config,
  } = useAdaptiveTesting({
    minQuestions: 20, // Shorter for practice
    maxQuestions: 50,
    stoppingRule: "classification",
  });

  // Timer for question
  useEffect(() => {
    if (testStarted && currentQuestion && !showExplanation) {
      timerRef.current = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testStarted, currentQuestion, showExplanation]);

  const handleStartTest = async () => {
    const success = await startSession();
    if (success) {
      setTestStarted(true);
    }
  };

  const handleSelectAnswer = (answerId: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answerId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Submit to hook which checks correctness server-side
    const result = await submitAnswer(selectedAnswer, timeSpent);
    setLastAnswerCorrect(result.isCorrect ?? null);
    setCorrectAnswerId(result.correctAnswerId ?? null);

    if (result.finished) {
      setShowResult(true);
    } else {
      // Show explanation before moving to next question
      setShowExplanation(true);
    }
  };

  const handleNextQuestion = async () => {
    // Reset for next question
    setSelectedAnswer(null);
    setTimeSpent(0);
    setShowExplanation(false);
    setLastAnswerCorrect(null);
    setCorrectAnswerId(null);
  };

  const progress = getProgress();

  // Start screen
  if (!testStarted) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card className="p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Computer Adaptive Test</h1>
          <p className="text-muted-foreground mb-6">
            This test adapts to your ability level. Questions will get harder or easier
            based on your performance, similar to the real NREMT exam.
          </p>

          <div className="bg-muted rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Questions adapt based on your answers</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Minimum {config.minQuestions} questions, maximum {config.maxQuestions}</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Test ends when your ability level is confidently determined</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Explanations shown after each answer</span>
              </li>
            </ul>
          </div>

          <Button
            size="lg"
            onClick={handleStartTest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Loading Questions...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Adaptive Test
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  }

  // Result screen
  if (showResult && session) {
    const passed = session.pass_fail === "pass";
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card className="p-8 text-center">
          <div
            className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {passed ? (
              <Trophy className="h-10 w-10 text-green-600" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-red-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {passed ? "Congratulations!" : "Keep Practicing"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {passed
              ? "You demonstrated proficiency at the passing level."
              : "You're below the passing threshold. Review your weak areas and try again."}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-2xl font-bold">{session.questions_answered}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-2xl font-bold">{session.questions_correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-2xl font-bold">{session.final_score}%</p>
              <p className="text-sm text-muted-foreground">Score</p>
            </div>
          </div>

          <div className="mb-6">
            <Badge variant={passed ? "default" : "destructive"} className="text-lg px-4 py-1">
              {passed ? "PASS" : "FAIL"}
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-left">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Your Performance
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Ability:</span>
                <span className="font-medium">
                  {session.current_ability.toFixed(2)} (SE: {session.ability_se.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-medium">
                  {((session.questions_correct / session.questions_answered) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full">
            Take Another Test
          </Button>
        </Card>
      </div>
    );
  }

  // Test in progress
  if (!currentQuestion) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              Question {(progress?.questionsAnswered || 0) + 1}
            </Badge>
            <Badge variant="secondary">
              {progress?.questionsCorrect || 0} correct
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress?.estimatedProgress || 0}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {config.minQuestions}-{config.maxQuestions} questions, adapts to your level
        </p>
      </div>

      {/* Question Card */}
      <Card className="p-6">
        <div className="mb-4">
          <Badge variant="secondary">{currentQuestion.category}</Badge>
        </div>

        <h2 className="text-xl font-medium mb-6">{currentQuestion.question_text}</h2>

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options?.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = correctAnswerId === option.id;
            const showCorrectness = showExplanation;

            let optionClass = "border rounded-lg p-4 cursor-pointer transition-all ";
            if (showCorrectness) {
              if (isCorrect) {
                optionClass += "border-green-500 bg-green-50";
              } else if (isSelected && !isCorrect) {
                optionClass += "border-red-500 bg-red-50";
              } else {
                optionClass += "border-muted bg-muted/30";
              }
            } else if (isSelected) {
              optionClass += "border-primary bg-primary/5";
            } else {
              optionClass += "border-muted hover:border-primary/50";
            }

            return (
              <div
                key={option.id}
                className={optionClass}
                onClick={() => handleSelectAnswer(option.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-primary bg-primary text-white" : "border-muted"
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <span>{option.text}</span>
                  </div>
                  {showCorrectness && isCorrect && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {showCorrectness && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && currentQuestion.explanation && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              lastAnswerCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {lastAnswerCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-semibold">
                {lastAnswerCorrect ? "Correct!" : "Incorrect"}
              </span>
            </div>
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          {!showExplanation ? (
            <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              Next Question
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

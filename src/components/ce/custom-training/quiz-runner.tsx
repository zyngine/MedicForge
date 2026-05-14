"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Props {
  questions: QuizQuestion[];
  threshold: number;
  onSubmit: (answers: number[]) => Promise<{ score: number; passed: boolean }>;
}

export function QuizRunner({ questions, threshold, onSubmit }: Props) {
  const [answers, setAnswers] = useState<number[]>(questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const submit = async () => {
    setSubmitting(true);
    const r = await onSubmit(answers);
    setResult(r);
    setSubmitting(false);
  };

  if (result) {
    return (
      <div
        className={`border rounded-lg p-6 text-center ${
          result.passed
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <p className="text-2xl font-bold">{result.score}%</p>
        <p className="text-sm mt-2">
          {result.passed
            ? `Passed — required ${threshold}%`
            : `Not passed — needs ${threshold}%. You can retake.`}
        </p>
        {!result.passed && (
          <Button
            className="mt-4"
            onClick={() => {
              setResult(null);
              setAnswers(questions.map(() => -1));
            }}
          >
            Retake
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4 bg-card">
          <p className="font-medium mb-3">
            {i + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={answers[i] === oi}
                  onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? oi : v)))}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={submit} disabled={submitting || answers.some((a) => a === -1)}>
        {submitting ? "Submitting…" : "Submit Quiz"}
      </Button>
    </div>
  );
}

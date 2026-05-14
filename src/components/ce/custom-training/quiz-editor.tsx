"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Props {
  initialQuestions: QuizQuestion[];
  initialThreshold: number;
  onSave: (questions: QuizQuestion[], threshold: number) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function QuizEditor({ initialQuestions, initialThreshold, onSave, onDelete }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const addQuestion = () =>
    setQuestions((q) => [
      ...q,
      { id: crypto.randomUUID(), question: "", options: ["", ""], correct_index: 0 },
    ]);

  const removeQuestion = (i: number) =>
    setQuestions((q) => q.filter((_, idx) => idx !== i));

  const updateQuestion = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((q) => q.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    await onSave(questions, threshold);
    setSavedAt(new Date().toLocaleTimeString());
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Pass threshold</label>
        <input
          type="number"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
          className="w-20 px-2 py-1 border rounded text-sm"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No questions yet. Add a question to enable a knowledge check for this material.
        </p>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-muted-foreground pt-2">{i + 1}.</span>
            <textarea
              value={q.question}
              onChange={(e) => updateQuestion(i, { question: e.target.value })}
              placeholder="Question text"
              className="flex-1 px-3 py-2 border rounded text-sm min-h-[60px]"
            />
            <button
              onClick={() => removeQuestion(i)}
              className="p-1 hover:bg-muted rounded text-red-600"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 pl-6">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${i}`}
                  checked={q.correct_index === oi}
                  onChange={() => updateQuestion(i, { correct_index: oi })}
                />
                <input
                  value={opt}
                  onChange={(e) =>
                    updateQuestion(i, {
                      options: q.options.map((o, j) => (j === oi ? e.target.value : o)),
                    })
                  }
                  placeholder={`Option ${oi + 1}`}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                />
                {q.options.length > 2 && (
                  <button
                    onClick={() =>
                      updateQuestion(i, {
                        options: q.options.filter((_, j) => j !== oi),
                        correct_index:
                          q.correct_index >= oi ? Math.max(0, q.correct_index - 1) : q.correct_index,
                      })
                    }
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => updateQuestion(i, { options: [...q.options, ""] })}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add option
            </button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion}>
        <Plus className="h-4 w-4 mr-2" />
        Add Question
      </Button>

      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Quiz"}
        </Button>
        {onDelete && questions.length > 0 && (
          <Button variant="outline" onClick={onDelete}>
            Delete Quiz
          </Button>
        )}
        {savedAt && <span className="text-xs text-muted-foreground">Saved {savedAt}</span>}
      </div>
    </div>
  );
}

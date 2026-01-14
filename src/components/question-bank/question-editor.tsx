"use client";

import { useState } from "react";
import { Button, Input, Badge } from "@/components/ui";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type {
  QuestionBankItem,
  QuestionBankCategory,
  CreateQuestionInput,
  QuestionOption,
  QuestionType,
  QuestionDifficulty,
  CertificationLevel,
} from "@/lib/hooks/use-question-bank";

interface QuestionEditorProps {
  question?: QuestionBankItem | null;
  categories: QuestionBankCategory[];
  onSave: (data: CreateQuestionInput) => Promise<void>;
  onCancel: () => void;
}

export function QuestionEditor({ question, categories, onSave, onCancel }: QuestionEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateQuestionInput>({
    category_id: question?.category_id || undefined,
    question_text: question?.question_text || "",
    question_type: question?.question_type || "multiple_choice",
    options: question?.options || [
      { id: "a", text: "", isCorrect: true },
      { id: "b", text: "", isCorrect: false },
      { id: "c", text: "", isCorrect: false },
      { id: "d", text: "", isCorrect: false },
    ],
    correct_answer: question?.correct_answer || { answerId: "a" },
    explanation: question?.explanation || "",
    certification_level: question?.certification_level || "EMT",
    difficulty: question?.difficulty || "medium",
    points: question?.points || 1,
    time_estimate_seconds: question?.time_estimate_seconds || 60,
    source: question?.source || "",
    tags: question?.tags || [],
  });

  const [newTag, setNewTag] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: string | boolean) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };

    // If setting isCorrect to true for multiple choice, ensure only one is correct
    if (field === "isCorrect" && value === true && formData.question_type === "multiple_choice") {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
      setFormData({
        ...formData,
        options: newOptions,
        correct_answer: { answerId: newOptions[index].id },
      });
    } else {
      setFormData({ ...formData, options: newOptions });
    }
  };

  const addOption = () => {
    const newId = String.fromCharCode(97 + (formData.options?.length || 0));
    setFormData({
      ...formData,
      options: [...(formData.options || []), { id: newId, text: "", isCorrect: false }],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = (formData.options || []).filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: (formData.tags || []).filter((t) => t !== tag),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium mb-2">Question Text *</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 min-h-[100px]"
          value={formData.question_text}
          onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
          placeholder="Enter the question..."
          required
        />
      </div>

      {/* Question Type & Category Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Question Type *</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={formData.question_type}
            onChange={(e) =>
              setFormData({ ...formData, question_type: e.target.value as QuestionType })
            }
          >
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="short_answer">Short Answer</option>
            <option value="matching">Matching</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={formData.category_id || ""}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value || undefined })
            }
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Answer Options (for multiple choice) */}
      {(formData.question_type === "multiple_choice" || formData.question_type === "true_false") && (
        <div>
          <label className="block text-sm font-medium mb-2">Answer Options *</label>
          <div className="space-y-2">
            {formData.question_type === "true_false" ? (
              <div className="space-y-2">
                {["True", "False"].map((opt, i) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                      (formData.correct_answer as { answerId: string })?.answerId === opt.toLowerCase()
                        ? "border-green-500 bg-green-50"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="correct"
                      checked={
                        (formData.correct_answer as { answerId: string })?.answerId === opt.toLowerCase()
                      }
                      onChange={() =>
                        setFormData({ ...formData, correct_answer: { answerId: opt.toLowerCase() } })
                      }
                    />
                    <span className="font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <>
                {(formData.options || []).map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <input
                      type="radio"
                      name="correct"
                      checked={option.isCorrect}
                      onChange={() => updateOption(index, "isCorrect", true)}
                      className="shrink-0"
                    />
                    <span className="font-medium w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, "text", e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className={option.isCorrect ? "border-green-500" : ""}
                    />
                    {(formData.options?.length || 0) > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                {(formData.options?.length || 0) < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Select the radio button next to the correct answer
          </p>
        </div>
      )}

      {/* Short Answer */}
      {formData.question_type === "short_answer" && (
        <div>
          <label className="block text-sm font-medium mb-2">Correct Answer(s) *</label>
          <Input
            value={(formData.correct_answer as { text: string })?.text || ""}
            onChange={(e) => setFormData({ ...formData, correct_answer: { text: e.target.value } })}
            placeholder="Enter the correct answer"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Separate multiple acceptable answers with commas
          </p>
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-sm font-medium mb-2">Explanation (Rationale)</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 min-h-[80px]"
          value={formData.explanation}
          onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          placeholder="Explain why this is the correct answer..."
        />
      </div>

      {/* Metadata Row */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Certification Level</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={formData.certification_level}
            onChange={(e) =>
              setFormData({ ...formData, certification_level: e.target.value as CertificationLevel })
            }
          >
            <option value="EMR">EMR</option>
            <option value="EMT">EMT</option>
            <option value="AEMT">AEMT</option>
            <option value="Paramedic">Paramedic</option>
            <option value="All">All Levels</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Difficulty</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={formData.difficulty}
            onChange={(e) =>
              setFormData({ ...formData, difficulty: e.target.value as QuestionDifficulty })
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Points</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Time (seconds)</label>
          <Input
            type="number"
            min={10}
            max={600}
            value={formData.time_estimate_seconds}
            onChange={(e) =>
              setFormData({ ...formData, time_estimate_seconds: parseInt(e.target.value) || 60 })
            }
          />
        </div>
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium mb-2">Source</label>
        <Input
          value={formData.source || ""}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          placeholder="e.g., NREMT Practice, Textbook Ch. 5, Custom"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {(formData.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Add
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : question ? "Update Question" : "Create Question"}
        </Button>
      </div>
    </form>
  );
}

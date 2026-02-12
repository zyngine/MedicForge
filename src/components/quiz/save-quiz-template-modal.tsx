"use client";

import * as React from "react";
import {
  Modal,
  Button,
  Input,
  Label,
  Select,
  Alert,
} from "@/components/ui";
import { Save, Tag, X } from "lucide-react";
import { useSaveAsQuizTemplate, useCreateQuizTemplate, type QuizQuestion } from "@/lib/hooks/use-quiz-templates";

interface SaveQuizTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either provide assignmentId (for saving existing quiz)
  assignmentId?: string;
  // Or provide questions directly (for saving from quiz builder)
  questions?: QuizQuestion[];
  quizSettings?: {
    time_limit_minutes?: number;
    max_attempts?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    show_correct_answers?: boolean;
    passing_score?: number;
  };
  defaultName?: string;
  onSuccess?: () => void;
}

const certificationLevels = [
  { value: "", label: "None" },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
];

export function SaveQuizTemplateModal({
  isOpen,
  onClose,
  assignmentId,
  questions,
  quizSettings,
  defaultName = "",
  onSuccess,
}: SaveQuizTemplateModalProps) {
  const [name, setName] = React.useState(defaultName);
  const [description, setDescription] = React.useState("");
  const [certLevel, setCertLevel] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const saveFromAssignment = useSaveAsQuizTemplate();
  const createTemplate = useCreateQuizTemplate();

  const isLoading = saveFromAssignment.isPending || createTemplate.isPending;

  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription("");
      setCertLevel("");
      setTags([]);
      setError(null);
    }
  }, [isOpen, defaultName]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a template name");
      return;
    }

    setError(null);

    try {
      if (assignmentId) {
        // Save from existing assignment
        await saveFromAssignment.mutateAsync({
          assignmentId,
          name: name.trim(),
          description: description.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          certification_level: certLevel || undefined,
        });
      } else if (questions) {
        // Create from questions directly
        await createTemplate.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          questions,
          tags: tags.length > 0 ? tags : undefined,
          certification_level: certLevel || undefined,
          ...quizSettings,
        });
      } else {
        setError("No questions to save");
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to save template:", err);
      const errorMessage = err?.message || err?.error?.message || "Unknown error"; setError(`Failed to save template: ${errorMessage}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Quiz Template"
      description="Save this quiz as a reusable template that can be used in other courses."
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="template-name" required>
            Template Name
          </Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., EMT Module 1 Quiz"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-description">Description</Label>
          <Input
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this quiz template"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cert-level">Certification Level</Label>
          <Select
            value={certLevel}
            onChange={setCertLevel}
            options={certificationLevels}
          />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tags..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              <Tag className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>
    </Modal>
  );
}

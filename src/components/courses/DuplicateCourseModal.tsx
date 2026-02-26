"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Input,
  Label,
  Checkbox,
  Alert,
  Spinner,
} from "@/components/ui";
import { Copy } from "lucide-react";

interface DuplicateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    start_date?: string | null;
  };
  onSuccess?: (newCourse: { id: string; title: string }) => void;
}

export function DuplicateCourseModal({
  isOpen,
  onClose,
  course,
  onSuccess,
}: DuplicateCourseModalProps) {
  const [newTitle, setNewTitle] = useState(`${course.title} (Copy)`);
  const [includeModules, setIncludeModules] = useState(true);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [includeQuizzes, setIncludeQuizzes] = useState(true);
  const [resetDates, setResetDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDuplicate = async () => {
    if (!newTitle.trim()) {
      setError("Please enter a title for the new course");
      return;
    }

    if (resetDates && !newStartDate) {
      setError("Please select a new start date");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/duplicate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: course.id,
          new_title: newTitle.trim(),
          include_modules: includeModules,
          include_assignments: includeAssignments,
          include_quizzes: includeQuizzes,
          reset_dates: resetDates,
          new_start_date: resetDates ? newStartDate : undefined,
          save_as_template: saveAsTemplate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to duplicate course");
      }

      onSuccess?.(result.course);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate course");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewTitle(`${course.title} (Copy)`);
    setIncludeModules(true);
    setIncludeAssignments(true);
    setIncludeQuizzes(true);
    setResetDates(false);
    setNewStartDate("");
    setSaveAsTemplate(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Duplicate Course"
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="newTitle">New Course Title *</Label>
          <Input
            id="newTitle"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter title for the new course"
          />
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <p className="font-medium text-sm">Include in copy:</p>

          <div className="flex items-center gap-2">
            <Checkbox
              id="includeModules"
              checked={includeModules}
              onChange={(checked) => setIncludeModules(checked as boolean)}
            />
            <Label htmlFor="includeModules" className="cursor-pointer">
              Modules and Lessons
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="includeAssignments"
              checked={includeAssignments}
              onChange={(checked) => setIncludeAssignments(checked as boolean)}
              disabled={!includeModules}
            />
            <Label htmlFor="includeAssignments" className="cursor-pointer">
              Assignments
            </Label>
          </div>

          <div className="flex items-center gap-2 ml-6">
            <Checkbox
              id="includeQuizzes"
              checked={includeQuizzes}
              onChange={(checked) => setIncludeQuizzes(checked as boolean)}
              disabled={!includeAssignments || !includeModules}
            />
            <Label htmlFor="includeQuizzes" className="cursor-pointer text-sm text-muted-foreground">
              Include quiz questions
            </Label>
          </div>
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="resetDates"
              checked={resetDates}
              onChange={(checked) => setResetDates(checked as boolean)}
            />
            <Label htmlFor="resetDates" className="cursor-pointer">
              Reset dates to new schedule
            </Label>
          </div>

          {resetDates && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="newStartDate" className="text-sm">New Start Date *</Label>
              <Input
                id="newStartDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                All due dates will be adjusted relative to this start date
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border rounded-lg p-4">
          <Checkbox
            id="saveAsTemplate"
            checked={saveAsTemplate}
            onChange={(checked) => setSaveAsTemplate(checked as boolean)}
          />
          <div>
            <Label htmlFor="saveAsTemplate" className="cursor-pointer">
              Save as Template
            </Label>
            <p className="text-xs text-muted-foreground">
              Course will be marked as a template for future use
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Course
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import * as React from "react";
import { Button, Input, Label, Textarea, Checkbox, Modal, ModalFooter } from "@/components/ui";
import { Loader2 } from "lucide-react";

interface ModuleFormData {
  title: string;
  description: string;
  unlock_date: string;
  is_published: boolean;
}

interface ModuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModuleFormData) => Promise<void>;
  initialData?: Partial<ModuleFormData>;
  isEditing?: boolean;
}

export function ModuleForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: ModuleFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<ModuleFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    unlock_date: initialData?.unlock_date || "",
    is_published: initialData?.is_published || false,
  });

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialData?.title || "",
        description: initialData?.description || "",
        unlock_date: initialData?.unlock_date || "",
        is_published: initialData?.is_published || false,
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Module title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Module" : "Add Module"}
      description={isEditing ? "Update module details" : "Create a new module for your course"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-error/10 text-error text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title" required>Module Title</Label>
          <Input
            id="title"
            placeholder="e.g., Introduction to Patient Assessment"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of what this module covers..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unlock_date">Unlock Date (Optional)</Label>
          <Input
            id="unlock_date"
            type="date"
            value={formData.unlock_date}
            onChange={(e) => setFormData(prev => ({ ...prev, unlock_date: e.target.value }))}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            If set, the module will be locked until this date
          </p>
        </div>

        <Checkbox
          id="is_published"
          checked={formData.is_published}
          onChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
          disabled={isSubmitting}
          label="Publish module immediately"
        />

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Saving..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Save Changes" : "Create Module"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

"use client";

import * as React from "react";
import { Button, Input, Label, Textarea, Select, Checkbox, Modal, ModalFooter } from "@/components/ui";
import { Loader2, Video, FileText, Type, Code, Trash2, FileSpreadsheet, Presentation, Link2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LessonAttachmentUploader, type AttachmentResult } from "./lesson-attachment-uploader";

type ContentType = "video" | "document" | "text" | "embed";

interface LessonFormData {
  title: string;
  content_type: ContentType;
  content: string;
  video_url: string;
  document_url: string;
  duration_minutes: number | null;
  is_published: boolean;
}

interface LessonAttachment {
  id: string;
  title: string;
  kind: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  bunny_video_id: string | null;
  storage_path: string | null;
}

interface LessonEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LessonFormData) => Promise<void>;
  initialData?: Partial<LessonFormData>;
  isEditing?: boolean;
  lessonId?: string;
}

const ATTACHMENT_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  powerpoint: Presentation,
  word: FileText,
  excel: FileSpreadsheet,
  video_upload: Video,
  video_url: Link2,
  other: Paperclip,
};

const contentTypeOptions = [
  { value: "text", label: "Text/Rich Content" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document/PDF" },
  { value: "embed", label: "Embed Code" },
];

const _contentTypeIcons: Record<ContentType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  embed: <Code className="h-4 w-4" />,
};

export function LessonEditor({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  lessonId,
}: LessonEditorProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [attachments, setAttachments] = React.useState<LessonAttachment[]>([]);
  const [formData, setFormData] = React.useState<LessonFormData>({
    title: initialData?.title || "",
    content_type: initialData?.content_type || "text",
    content: initialData?.content || "",
    video_url: initialData?.video_url || "",
    document_url: initialData?.document_url || "",
    duration_minutes: initialData?.duration_minutes || null,
    is_published: initialData?.is_published || false,
  });

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialData?.title || "",
        content_type: initialData?.content_type || "text",
        content: initialData?.content || "",
        video_url: initialData?.video_url || "",
        document_url: initialData?.document_url || "",
        duration_minutes: initialData?.duration_minutes || null,
        is_published: initialData?.is_published || false,
      });
      setError(null);
      setAttachments([]);
    }
  }, [isOpen, initialData]);

  // Fetch current user's tenant_id (needed for the upload path prefix) and
  // existing attachments when editing.
  React.useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);

      if (lessonId) {
        const res = await fetch(`/api/lessons/${lessonId}/attachments`);
        if (res.ok) {
          const { attachments: list } = await res.json();
          setAttachments(list || []);
        }
      }
    };
    load();
  }, [isOpen, lessonId]);

  const addAttachment = async (result: AttachmentResult) => {
    if (!lessonId) return;
    const res = await fetch(`/api/lessons/${lessonId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const { attachment } = await res.json();
      setAttachments((prev) => [...prev, attachment]);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to attach file.");
    }
  };

  const removeAttachment = async (id: string) => {
    if (!lessonId) return;
    if (!confirm("Remove this attachment?")) return;
    const res = await fetch(`/api/lessons/${lessonId}/attachments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const formatSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Lesson title is required");
      return;
    }

    // Validate based on content type
    if (formData.content_type === "video" && !formData.video_url.trim()) {
      setError("Video URL is required for video lessons");
      return;
    }
    if (formData.content_type === "document" && !formData.document_url.trim()) {
      setError("Document URL is required for document lessons");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Lesson" : "Add Lesson"}
      description={isEditing ? "Update lesson content" : "Create a new lesson for this module"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-error/10 text-error text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title" required>Lesson Title</Label>
          <Input
            id="title"
            placeholder="e.g., Primary Assessment Techniques"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="content_type">Content Type</Label>
            <Select
              id="content_type"
              options={contentTypeOptions}
              value={formData.content_type}
              onChange={(value) => setFormData(prev => ({ ...prev, content_type: value as ContentType }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              placeholder="e.g., 15"
              value={formData.duration_minutes || ""}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                duration_minutes: e.target.value ? parseInt(e.target.value) : null
              }))}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Content Type Specific Fields */}
        {formData.content_type === "video" && (
          <div className="space-y-2">
            <Label htmlFor="video_url" required>Video URL</Label>
            <Input
              id="video_url"
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              value={formData.video_url}
              onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Supports YouTube, Vimeo, or direct video URLs
            </p>
          </div>
        )}

        {formData.content_type === "document" && (
          <div className="space-y-2">
            <Label htmlFor="document_url" required>Document URL</Label>
            <Input
              id="document_url"
              placeholder="https://example.com/document.pdf"
              value={formData.document_url}
              onChange={(e) => setFormData(prev => ({ ...prev, document_url: e.target.value }))}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Link to a PDF or other document file
            </p>
          </div>
        )}

        {formData.content_type === "text" && (
          <div className="space-y-2">
            <Label htmlFor="content">Lesson Content</Label>
            <Textarea
              id="content"
              placeholder="Enter lesson content here. You can use markdown formatting..."
              rows={8}
              value={typeof formData.content === 'string' ? formData.content : JSON.stringify(formData.content)}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported
            </p>
          </div>
        )}

        {formData.content_type === "embed" && (
          <div className="space-y-2">
            <Label htmlFor="content">Embed Code</Label>
            <Textarea
              id="content"
              placeholder="<iframe src='...'></iframe>"
              rows={6}
              value={typeof formData.content === 'string' ? formData.content : ''}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Paste embed code from external sources (H5P, Google Slides, etc.)
            </p>
          </div>
        )}

        <Checkbox
          id="is_published"
          checked={formData.is_published}
          onChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
          disabled={isSubmitting}
          label="Publish lesson immediately"
        />

        {/* Attachments — only editable for existing lessons. */}
        {isEditing && lessonId && tenantId && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium m-0">Attachments</Label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((a) => {
                  const Icon = ATTACHMENT_ICON[a.kind] || FileText;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2 border rounded-md">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.kind.replace("_", " ")}
                          {a.file_size ? ` · ${formatSize(a.file_size)}` : ""}
                        </p>
                      </div>
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline px-2"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className="p-1 hover:bg-muted rounded text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <LessonAttachmentUploader
              tenantId={tenantId}
              lessonId={lessonId}
              onUploaded={addAttachment}
            />
            <p className="text-xs text-muted-foreground">
              Upload PowerPoint, PDF, Word, Excel, or videos. Students will see these alongside the lesson content.
            </p>
          </div>
        )}
        {isEditing && !lessonId && (
          <p className="text-xs text-muted-foreground border-t pt-3 italic">
            Save the lesson once, then reopen it to upload PowerPoint, PDF, video, and other attachments.
          </p>
        )}
        {!isEditing && (
          <p className="text-xs text-muted-foreground border-t pt-3 italic">
            After you create this lesson, you can reopen it to attach PowerPoint, PDF, video, and other files.
          </p>
        )}

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
              isEditing ? "Save Changes" : "Create Lesson"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

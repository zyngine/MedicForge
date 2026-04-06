"use client";

import { useState } from "react";
import { Plus, FileText, Trash2, Loader2, Upload, Database } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Modal,
  Alert,
} from "@/components/ui";
import {
  usePlagiarismSources,
  useAddPlagiarismSource,
  useRemovePlagiarismSource,
} from "@/lib/hooks/use-plagiarism";
import { format } from "date-fns";

const ACCEPTED_FILE_TYPES = ".txt,.pdf,.doc,.docx,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function PlagiarismSourcesManager() {
  const { data: sources, isLoading } = usePlagiarismSources();
  const { mutate: addSource, isPending: isAdding, error: addError } = useAddPlagiarismSource();
  const { mutate: removeSource, isPending: isRemoving } = useRemovePlagiarismSource();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;

    addSource(
      { title: title.trim(), content: content.trim(), sourceType: "document" },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setTitle("");
          setContent("");
        },
      }
    );
  };

  const handleRemove = (sourceId: string) => {
    setRemovingId(sourceId);
    removeSource(sourceId, {
      onSettled: () => setRemovingId(null),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isText = file.type.startsWith("text/") || fileName.endsWith(".txt");
    const isPdf = fileName.endsWith(".pdf");
    const isWord = fileName.endsWith(".doc") || fileName.endsWith(".docx");

    if (!isText && !isPdf && !isWord) {
      setParseError("Please upload a PDF, Word (.docx), or text file");
      return;
    }

    setParseError(null);

    try {
      // For text files, read directly
      if (isText) {
        const text = await file.text();
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        setContent(text);
        return;
      }

      // For PDF/Word, use the API
      setIsParsing(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/plagiarism/parse-document", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse document");
      }

      setTitle(result.title);
      setContent(result.content);
    } catch (err) {
      console.error("Error reading file:", err);
      setParseError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setIsParsing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Plagiarism Source Database
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Documents and submissions used for plagiarism comparison
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Document
        </Button>
      </div>

      {/* Sources List */}
      {sources?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-4 text-muted-foreground">No sources in database</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add documents or graded submissions will be automatically included
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources?.map((source) => (
            <Card key={source.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{source.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{source.source_type}</span>
                        <span>•</span>
                        <span>{source.word_count?.toLocaleString()} words</span>
                        <span>•</span>
                        <span>Added {format(new Date(source.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(source.id)}
                    disabled={removingId === source.id || isRemoving}
                  >
                    {removingId === source.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {sources && sources.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{sources.length}</p>
              <p className="text-xs text-muted-foreground">Total Sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">
                {sources.filter((s) => s.source_type === "submission").length}
              </p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">
                {sources.filter((s) => s.source_type === "document").length}
              </p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setTitle("");
          setContent("");
          setParseError(null);
        }}
        title="Add Source Document"
      >
        <div className="space-y-4">
          {addError && (
            <Alert variant="error">
              {addError instanceof Error ? addError.message : "Failed to add document"}
            </Alert>
          )}

          {parseError && (
            <Alert variant="error" onClose={() => setParseError(null)}>
              {parseError}
            </Alert>
          )}

          <div className="flex items-center gap-3 p-4 border rounded-lg border-dashed">
            {isParsing ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isParsing ? "Parsing document..." : "Upload a document"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, Word (.docx), or text files supported
              </p>
            </div>
            <label className={`cursor-pointer ${isParsing ? "pointer-events-none opacity-50" : ""}`}>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileUpload}
                className="hidden"
                disabled={isParsing}
              />
              <span className="text-sm text-primary hover:underline">
                Browse
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste document content here..."
              rows={10}
            />
            {content && (
              <p className="text-xs text-muted-foreground mt-1">
                {content.split(/\s+/).filter((w) => w.length > 0).length} words
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setTitle("");
                setContent("");
                setParseError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !content.trim() || isAdding || isParsing}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, Package, Loader2, X, FileArchive } from "lucide-react";
import { Card, CardContent, Button, Alert } from "@/components/ui";
import { useUploadScormPackage } from "@/lib/hooks/use-scorm";

interface ScormUploaderProps {
  courseId?: string;
  moduleId?: string;
  onUploadComplete?: () => void;
}

export function ScormUploader({
  courseId,
  moduleId,
  onUploadComplete,
}: ScormUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadPackage, isPending, error } = useUploadScormPackage();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadPackage(
      { file: selectedFile, courseId, moduleId },
      {
        onSuccess: () => {
          setSelectedFile(null);
          onUploadComplete?.();
        },
      }
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error">
          {error instanceof Error ? error.message : "Failed to upload package"}
        </Alert>
      )}

      {!selectedFile ? (
        <Card>
          <CardContent className="p-0">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 font-medium">Upload SCORM Package</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag and drop a SCORM .zip file, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports SCORM 1.2 and SCORM 2004
              </p>

              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <FileArchive className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button onClick={handleUpload} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

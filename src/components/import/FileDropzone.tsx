"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui";
import { validateFile } from "@/lib/utils/import-parser";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  accept?: string;
  disabled?: boolean;
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  accept: _accept = ".csv,.xlsx,.xls",
  disabled = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !disabled) {
        const file = acceptedFiles[0];
        const validation = validateFile(file);
        if (validation.valid) {
          onFileSelect(file);
        } else {
          // Could show error toast here
          console.error(validation.error);
        }
      }
    },
    [onFileSelect, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled,
  });

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed rounded-lg p-6 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      {isDragActive ? (
        <p className="font-medium text-primary">Drop the file here...</p>
      ) : (
        <>
          <p className="font-medium">Drag and drop your file here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
        </>
      )}
      <p className="text-xs text-muted-foreground mt-4">
        Accepts: CSV, Excel (.xlsx, .xls) — Max 5MB
      </p>
    </div>
  );
}

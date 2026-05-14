"use client";

import { useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Upload, Link2, FileText, FileSpreadsheet, Presentation, Video } from "lucide-react";

export type AttachmentKind =
  | "pdf"
  | "powerpoint"
  | "word"
  | "excel"
  | "video_upload"
  | "video_url"
  | "other";

export interface AttachmentResult {
  title: string;
  kind: AttachmentKind;
  file_url: string;
  mime_type?: string;
  file_size?: number;
  bunny_video_id?: string;
  storage_path?: string;
}

interface Props {
  tenantId: string;
  lessonId: string;
  onUploaded: (result: AttachmentResult) => void;
}

const PRESETS: { key: "files" | "video_upload" | "video_url"; label: string; icon: typeof FileText }[] = [
  { key: "files", label: "Document or Slides", icon: FileText },
  { key: "video_upload", label: "Upload Video", icon: Video },
  { key: "video_url", label: "Video URL", icon: Link2 },
];

const FILE_ACCEPT =
  ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx," +
  "application/pdf," +
  "application/vnd.ms-powerpoint," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function classifyFile(file: File): { kind: AttachmentKind; icon: typeof FileText } {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { kind: "pdf", icon: FileText };
  if (name.endsWith(".pptx") || name.endsWith(".ppt")) return { kind: "powerpoint", icon: Presentation };
  if (name.endsWith(".docx") || name.endsWith(".doc")) return { kind: "word", icon: FileText };
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return { kind: "excel", icon: FileSpreadsheet };
  return { kind: "other", icon: FileText };
}

export function LessonAttachmentUploader({ tenantId, lessonId, onUploaded }: Props) {
  const [mode, setMode] = useState<"files" | "video_upload" | "video_url">("files");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress("Uploading…");
    try {
      const supabase = createClient();
      const { kind } = classifyFile(file);
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_.-]/g, "");
      const path = `${tenantId}/${lessonId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("lesson-materials")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: signed } = await supabase.storage
        .from("lesson-materials")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Failed to create signed URL");
      onUploaded({
        title: file.name,
        kind,
        file_url: url,
        mime_type: file.type,
        file_size: file.size,
        storage_path: path,
      });
      setProgress("Uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVideo = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress("Creating video…");
    try {
      const createRes = await fetch("/api/lms/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, "") }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create video");
      }
      const { videoId, libraryId, authSignature, authExpire, embedUrl } = await createRes.json();

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: 10 * 1024 * 1024,
          metadata: { filetype: file.type, title: file.name.replace(/\.[^.]+$/, "") },
          headers: {
            AuthorizationSignature: authSignature,
            AuthorizationExpire: String(authExpire),
            VideoId: videoId,
            LibraryId: String(libraryId),
          },
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress(`Uploading (${pct}%)…`);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      onUploaded({
        title: file.name.replace(/\.[^.]+$/, ""),
        kind: "video_upload",
        file_url: embedUrl,
        mime_type: file.type,
        file_size: file.size,
        bunny_video_id: videoId,
      });
      setProgress("Uploaded — video is processing in the background");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = () => {
    const trimmedUrl = urlInput.trim();
    const trimmedTitle = urlTitle.trim();
    if (!trimmedUrl) { setError("Enter a URL"); return; }
    try { new URL(trimmedUrl); } catch { setError("Invalid URL"); return; }
    if (!trimmedTitle) { setError("Enter a title"); return; }
    setError(null);
    onUploaded({
      title: trimmedTitle,
      kind: "video_url",
      file_url: trimmedUrl,
    });
    setUrlInput("");
    setUrlTitle("");
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          const active = mode === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setMode(p.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
            >
              <Icon className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {mode === "video_url" ? (
        <div className="space-y-2">
          <input
            type="text"
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
            placeholder="Title (e.g. Lecture 1 recording)"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <Button type="button" onClick={handleUrl}>Add URL</Button>
          </div>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${uploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading
              ? progress
              : mode === "files"
                ? "Select a PDF, PowerPoint, Word, or Excel file"
                : "Select a video file"}
          </span>
          <input
            type="file"
            accept={mode === "files" ? FILE_ACCEPT : "video/*"}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (mode === "files") handleFile(f);
              else handleVideo(f);
            }}
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

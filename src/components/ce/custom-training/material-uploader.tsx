"use client";

import { useState } from "react";
import * as tus from "tus-js-client";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Upload, Link2, FileText, Video } from "lucide-react";

export type UploadContentType = "pdf" | "video_upload" | "video_url";

export interface UploaderResult {
  content_type: UploadContentType;
  content_url: string;
  content_metadata: Record<string, unknown>;
}

interface Props {
  agencyId: string;
  materialId?: string;
  onUploaded: (result: UploaderResult) => void;
}

export function MaterialUploader({ agencyId, materialId, onUploaded }: Props) {
  const [mode, setMode] = useState<UploadContentType>("pdf");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const handlePdf = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress("Uploading PDF…");
    try {
      const supabase = createCEClient();
      const folderId = materialId || crypto.randomUUID();
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_.-]/g, "");
      const path = `${agencyId}/${folderId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("ce-custom-materials")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: signed } = await supabase.storage
        .from("ce-custom-materials")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Failed to create signed URL");
      onUploaded({
        content_type: "pdf",
        content_url: url,
        content_metadata: { file_size: file.size, mime_type: file.type, storage_path: path },
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
      const createRes = await fetch("/api/ce/video/create", {
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
        content_type: "video_upload",
        content_url: embedUrl,
        content_metadata: { bunny_video_id: videoId, file_size: file.size },
      });
      setProgress("Uploaded — video is processing in the background");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) { setError("Enter a URL"); return; }
    try { new URL(trimmed); } catch { setError("Invalid URL"); return; }
    setError(null);
    onUploaded({
      content_type: "video_url",
      content_url: trimmed,
      content_metadata: {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("pdf")} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode === "pdf" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
          <FileText className="h-4 w-4" />PDF
        </button>
        <button type="button" onClick={() => setMode("video_upload")} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode === "video_upload" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
          <Video className="h-4 w-4" />Upload Video
        </button>
        <button type="button" onClick={() => setMode("video_url")} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode === "video_url" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
          <Link2 className="h-4 w-4" />Video URL
        </button>
      </div>

      {mode === "video_url" ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <Button type="button" onClick={handleUrl}>Use URL</Button>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${uploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? progress : mode === "pdf" ? "Select a PDF" : "Select a video file"}
          </span>
          <input
            type="file"
            accept={mode === "pdf" ? "application/pdf" : "video/*"}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (mode === "pdf") handlePdf(f);
              else handleVideo(f);
            }}
          />
        </label>
      )}

      {mode === "video_upload" && (
        <p className="text-xs text-muted-foreground">
          Videos upload to Bunny Stream for adaptive streaming. Large files supported. Processing happens in the background.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

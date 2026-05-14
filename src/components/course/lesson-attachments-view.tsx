"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Video,
  Link2,
  Download,
  Paperclip,
} from "lucide-react";

interface Attachment {
  id: string;
  title: string;
  kind: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  bunny_video_id: string | null;
}

const KIND_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  powerpoint: Presentation,
  word: FileText,
  excel: FileSpreadsheet,
  video_upload: Video,
  video_url: Link2,
  other: Paperclip,
};

function officeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function embedVideoUrl(rawUrl: string): string {
  const yt = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = rawUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return rawUrl;
}

export function LessonAttachmentsView({ lessonId }: { lessonId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/lessons/${lessonId}/attachments`);
      if (res.ok) {
        const { attachments: list } = await res.json();
        setAttachments(list || []);
      }
      setLoading(false);
    };
    load();
  }, [lessonId]);

  if (loading || attachments.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t mt-6">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Attachments ({attachments.length})
        </h3>
      </div>
      <div className="space-y-4">
        {attachments.map((a) => (
          <AttachmentItem key={a.id} attachment={a} />
        ))}
      </div>
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const Icon = KIND_ICON[attachment.kind] || FileText;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="font-medium text-sm flex-1 truncate">{attachment.title}</p>
        <a
          href={attachment.file_url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>

      {attachment.kind === "pdf" && (
        <iframe
          src={attachment.file_url}
          className="w-full h-[600px] bg-white"
          title={attachment.title}
        />
      )}

      {(attachment.kind === "powerpoint" || attachment.kind === "word" || attachment.kind === "excel") && (
        <iframe
          src={officeViewerUrl(attachment.file_url)}
          className="w-full h-[600px] bg-white"
          title={attachment.title}
        />
      )}

      {attachment.kind === "video_upload" && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={attachment.file_url}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={attachment.title}
          />
        </div>
      )}

      {attachment.kind === "video_url" && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedVideoUrl(attachment.file_url)}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={attachment.title}
          />
        </div>
      )}

      {attachment.kind === "other" && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Click <strong>Download</strong> above to open this file.
        </div>
      )}
    </div>
  );
}

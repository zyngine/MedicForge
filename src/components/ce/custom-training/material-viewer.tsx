"use client";

import { useEffect } from "react";

interface Props {
  contentType: "pdf" | "video_upload" | "video_url" | "scorm";
  contentUrl: string;
  onViewed?: () => void;
}

export function MaterialViewer({ contentType, contentUrl, onViewed }: Props) {
  useEffect(() => {
    onViewed?.();
  }, [onViewed]);

  if (contentType === "pdf") {
    return (
      <iframe
        src={contentUrl}
        className="w-full h-[70vh] border rounded-lg bg-white"
        title="PDF viewer"
      />
    );
  }
  if (contentType === "video_upload") {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={contentUrl}
          className="w-full h-full rounded-lg"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (contentType === "video_url") {
    let embedUrl = contentUrl;
    const ytMatch = contentUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = contentUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return (
      <div className="aspect-video w-full">
        <iframe
          src={embedUrl}
          className="w-full h-full rounded-lg"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">Unsupported content type: {contentType}</p>;
}

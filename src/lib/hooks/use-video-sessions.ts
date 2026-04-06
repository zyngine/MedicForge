"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface VideoSession {
  id: string;
  tenant_id: string;
  course_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  session_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  zoom_meeting_id: string | null;
  join_url: string | null;
  start_url: string | null;
  password: string | null;
  manual_link: string | null;
  video_platform: string | null;
  recording_url: string | null;
  is_recording_available: boolean;
  status: string;
  created_at: string;
  course?: { id: string; title: string } | null;
  creator?: { id: string; full_name: string } | null;
}

interface CreateVideoSessionParams {
  title: string;
  description?: string;
  courseId?: string;
  sessionType?: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone?: string;
  manualLink?: string;
  videoPlatform?: string;
}

interface UseVideoSessionsOptions {
  courseId?: string;
  upcoming?: boolean;
  status?: string;
}

export function useVideoSessions(options: UseVideoSessionsOptions = {}) {
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.courseId) params.set("courseId", options.courseId);
      if (options.upcoming) params.set("upcoming", "true");
      if (options.status) params.set("status", options.status);

      const response = await fetch(`/api/video-sessions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video sessions");
      }

      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch sessions"));
    } finally {
      setIsLoading(false);
    }
  }, [options.courseId, options.upcoming, options.status]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (
    params: CreateVideoSessionParams
  ): Promise<VideoSession | null> => {
    try {
      const response = await fetch("/api/video-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create video session");
      }

      await fetchSessions();
      return data.session;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create session"));
      return null;
    }
  };

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("video_sessions")
        .delete()
        .eq("id", sessionId);

      if (deleteError) throw deleteError;

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete session"));
      return false;
    }
  };

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
    createSession,
    deleteSession,
  };
}

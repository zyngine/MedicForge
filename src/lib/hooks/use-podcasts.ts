"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface PodcastSeries {
  id: string;
  tenant_id: string;
  course_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  is_published: boolean;
  episode_count: number;
  total_duration_minutes: number;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: { id: string; full_name: string };
  course?: { id: string; title: string };
  episodes?: PodcastEpisode[];
}

export interface PodcastEpisode {
  id: string;
  tenant_id: string;
  series_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number;
  transcript: string | null;
  show_notes: string | null;
  episode_number: number;
  published_at: string | null;
  is_published: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
  // User progress (when joined)
  user_progress?: PodcastProgress;
}

export interface PodcastProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  episode_id: string;
  current_position_seconds: number;
  is_completed: boolean;
  completed_at: string | null;
  playback_speed: number;
}

// Hook for podcast series
export function usePodcastSeries(courseId?: string) {
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSeries = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("podcast_series")
        .select(`
          *,
          creator:users!podcast_series_created_by_fkey(id, full_name),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSeries(data || []);
    } catch (err) {
      console.error("Failed to fetch podcast series:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const createSeries = async (input: {
    course_id?: string;
    title: string;
    description?: string;
    cover_image_url?: string;
    category?: string;
    is_published?: boolean;
  }): Promise<PodcastSeries | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("podcast_series")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          course_id: input.course_id || null,
          title: input.title,
          description: input.description || null,
          cover_image_url: input.cover_image_url || null,
          category: input.category || null,
          is_published: input.is_published ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      setSeries((prev) => [data, ...prev]);
      toast.success("Podcast series created");
      return data;
    } catch (err) {
      console.error("Failed to create series:", err);
      toast.error("Failed to create podcast series");
      return null;
    }
  };

  const updateSeries = async (id: string, updates: Partial<PodcastSeries>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("podcast_series")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setSeries((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      toast.success("Series updated");
      return true;
    } catch (err) {
      toast.error("Failed to update series");
      return false;
    }
  };

  const deleteSeries = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("podcast_series")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSeries((prev) => prev.filter((s) => s.id !== id));
      toast.success("Series deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete series");
      return false;
    }
  };

  return {
    series,
    isLoading,
    refetch: fetchSeries,
    createSeries,
    updateSeries,
    deleteSeries,
  };
}

// Hook for podcast episodes
export function usePodcastEpisodes(seriesId: string) {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchEpisodes = useCallback(async () => {
    if (!profile?.tenant_id || !seriesId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: episodesData, error } = await (supabase as any)
        .from("podcast_episodes")
        .select("*")
        .eq("series_id", seriesId)
        .eq("is_published", true)
        .order("episode_number", { ascending: true });

      if (error) throw error;

      // Fetch user progress for each episode
      if (profile?.id && episodesData?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: progressData } = await (supabase as any)
          .from("podcast_progress")
          .select("*")
          .eq("user_id", profile.id)
          .in("episode_id", episodesData.map((e: PodcastEpisode) => e.id));

        const progressMap = new Map(
          (progressData || []).map((p: PodcastProgress) => [p.episode_id, p])
        );

        const enrichedEpisodes = episodesData.map((ep: PodcastEpisode) => ({
          ...ep,
          user_progress: progressMap.get(ep.id) || null,
        }));

        setEpisodes(enrichedEpisodes);
      } else {
        setEpisodes(episodesData || []);
      }
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, seriesId, supabase]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const createEpisode = async (input: {
    title: string;
    description?: string;
    audio_url: string;
    duration_seconds: number;
    transcript?: string;
    show_notes?: string;
    is_published?: boolean;
  }): Promise<PodcastEpisode | null> => {
    if (!profile?.tenant_id) return null;

    try {
      const nextEpisodeNumber = episodes.length > 0
        ? Math.max(...episodes.map((e) => e.episode_number)) + 1
        : 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("podcast_episodes")
        .insert({
          tenant_id: profile.tenant_id,
          series_id: seriesId,
          title: input.title,
          description: input.description || null,
          audio_url: input.audio_url,
          duration_seconds: input.duration_seconds,
          transcript: input.transcript || null,
          show_notes: input.show_notes || null,
          episode_number: nextEpisodeNumber,
          is_published: input.is_published ?? false,
          published_at: input.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      setEpisodes((prev) => [...prev, data]);
      toast.success("Episode added");
      return data;
    } catch (err) {
      toast.error("Failed to add episode");
      return null;
    }
  };

  const updateEpisode = async (id: string, updates: Partial<PodcastEpisode>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("podcast_episodes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      return true;
    } catch (err) {
      toast.error("Failed to update episode");
      return false;
    }
  };

  const deleteEpisode = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("podcast_episodes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setEpisodes((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete episode");
      return false;
    }
  };

  const totalDuration = episodes.reduce((sum, e) => sum + e.duration_seconds, 0);
  const completedEpisodes = episodes.filter((e) => e.user_progress?.is_completed);

  return {
    episodes,
    isLoading,
    totalDuration,
    completedEpisodes,
    refetch: fetchEpisodes,
    createEpisode,
    updateEpisode,
    deleteEpisode,
  };
}

// Hook for podcast playback/progress
export function usePodcastPlayer(episodeId: string) {
  const [progress, setProgress] = useState<PodcastProgress | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id || !profile?.id || !episodeId) return;

      try {
        setIsLoading(true);

        // Fetch episode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: episodeData, error: episodeError } = await (supabase as any)
          .from("podcast_episodes")
          .select("*")
          .eq("id", episodeId)
          .single();

        if (episodeError) throw episodeError;
        setEpisode(episodeData);

        // Increment play count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("podcast_episodes")
          .update({ play_count: (episodeData.play_count || 0) + 1 })
          .eq("id", episodeId);

        // Fetch or create progress
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { data: progressData, error: progressError } = await (supabase as any)
          .from("podcast_progress")
          .select("*")
          .eq("user_id", profile.id)
          .eq("episode_id", episodeId)
          .single();

        if (progressError?.code === "PGRST116") {
          // No progress found, create one
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newProgress } = await (supabase as any)
            .from("podcast_progress")
            .insert({
              tenant_id: profile.tenant_id,
              user_id: profile.id,
              episode_id: episodeId,
              current_position_seconds: 0,
              playback_speed: 1.0,
            })
            .select()
            .single();

          progressData = newProgress;
        }

        setProgress(progressData);
      } catch (err) {
        console.error("Failed to fetch podcast data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.tenant_id, profile?.id, episodeId, supabase]);

  const updatePosition = async (positionSeconds: number): Promise<void> => {
    if (!profile?.id || !episodeId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("podcast_progress")
        .update({
          current_position_seconds: positionSeconds,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id)
        .eq("episode_id", episodeId);

      setProgress((prev) =>
        prev ? { ...prev, current_position_seconds: positionSeconds } : null
      );
    } catch (err) {
      console.error("Failed to update position:", err);
    }
  };

  const markComplete = async (): Promise<void> => {
    if (!profile?.id || !episodeId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("podcast_progress")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id)
        .eq("episode_id", episodeId);

      setProgress((prev) =>
        prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : null
      );
    } catch (err) {
      console.error("Failed to mark complete:", err);
    }
  };

  const setPlaybackSpeed = async (speed: number): Promise<void> => {
    if (!profile?.id || !episodeId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("podcast_progress")
        .update({
          playback_speed: speed,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id)
        .eq("episode_id", episodeId);

      setProgress((prev) => (prev ? { ...prev, playback_speed: speed } : null));
    } catch (err) {
      console.error("Failed to set playback speed:", err);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = episode && progress
    ? (progress.current_position_seconds / episode.duration_seconds) * 100
    : 0;

  return {
    episode,
    progress,
    isLoading,
    progressPercentage,
    updatePosition,
    markComplete,
    setPlaybackSpeed,
    formatDuration,
  };
}

// Hook for recently played/continue listening
export function useRecentPodcasts() {
  const [recentEpisodes, setRecentEpisodes] = useState<(PodcastEpisode & { series?: PodcastSeries })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchRecent = async () => {
      if (!profile?.tenant_id || !profile?.id) return;

      try {
        setIsLoading(true);

        // Get recent progress entries
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: progressData, error } = await (supabase as any)
          .from("podcast_progress")
          .select(`
            *,
            episode:podcast_episodes(
              *,
              series:podcast_series(id, title, cover_image_url)
            )
          `)
          .eq("user_id", profile.id)
          .eq("is_completed", false)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        const episodes = (progressData || [])
          .filter((p: { episode: PodcastEpisode | null }) => p.episode)
          .map((p: { episode: PodcastEpisode & { series?: PodcastSeries }; current_position_seconds: number }) => ({
            ...p.episode,
            user_progress: {
              current_position_seconds: p.current_position_seconds,
            },
          }));

        setRecentEpisodes(episodes);
      } catch (err) {
        console.error("Failed to fetch recent podcasts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();
  }, [profile?.tenant_id, profile?.id, supabase]);

  return {
    recentEpisodes,
    isLoading,
  };
}

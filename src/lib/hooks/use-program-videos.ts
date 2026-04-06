"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

// Video source types
export const VIDEO_SOURCES = [
  { value: "upload", label: "Upload" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "external", label: "External URL" },
] as const;

export type VideoSource = (typeof VIDEO_SOURCES)[number]["value"];

export interface ProgramVideo {
  id: string;
  program_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_source: VideoSource;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  session_id: string | null;
  requires_coursework: boolean;
  coursework_assignment_id: string | null;
  minimum_watch_percentage: number;
  grants_virtual_attendance: boolean;
  prevent_skipping: boolean;
  is_active: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  program?: { id: string; name: string };
  session?: { id: string; title: string; scheduled_date: string };
  assignment?: { id: string; title: string };
}

export interface VideoProgress {
  id: string;
  video_id: string;
  user_id: string;
  tenant_id: string;
  watch_time_seconds: number;
  last_position_seconds: number;
  watch_percentage: number;
  completed: boolean;
  completed_at: string | null;
  virtual_attendance_granted: boolean;
  virtual_attendance_granted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: { id: string; full_name: string; email: string };
}

export interface StudentVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_source: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  session_id: string | null;
  grants_virtual_attendance: boolean;
  minimum_watch_percentage: number;
  requires_coursework: boolean;
  program_id: string;
  program_name: string | null;
  watch_percentage: number;
  completed: boolean;
  completed_at: string | null;
  virtual_attendance_granted: boolean;
  last_position_seconds: number;
}

export interface VideoStatistics {
  total_viewers: number;
  completed_count: number;
  average_watch_percentage: number;
  virtual_attendance_count: number;
}

export interface CreateVideoInput {
  program_id: string;
  title: string;
  description?: string;
  video_url: string;
  video_source?: VideoSource;
  duration_seconds?: number;
  thumbnail_url?: string;
  session_id?: string;
  requires_coursework?: boolean;
  coursework_assignment_id?: string;
  minimum_watch_percentage?: number;
  grants_virtual_attendance?: boolean;
  prevent_skipping?: boolean;
  sort_order?: number;
}

export interface UpdateVideoInput {
  title?: string;
  description?: string;
  video_url?: string;
  video_source?: VideoSource;
  duration_seconds?: number;
  thumbnail_url?: string;
  session_id?: string;
  requires_coursework?: boolean;
  coursework_assignment_id?: string;
  minimum_watch_percentage?: number;
  grants_virtual_attendance?: boolean;
  prevent_skipping?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

// ========== Instructor/Admin Video Management ==========

// Fetch videos for a program
export function useProgramVideos(programId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["program-videos", tenant?.id, programId],
    queryFn: async () => {
      if (!tenant?.id || !programId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_videos")
        .select(`
          *,
          session:attendance_sessions(id, title, scheduled_date),
          assignment:assignments(id, title)
        `)
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProgramVideo[];
    },
    enabled: !!tenant?.id && !!programId,
  });
}

// Fetch all videos across all programs (admin view)
export function useAllProgramVideos() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["all-program-videos", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_videos")
        .select(`
          *,
          program:cohorts(id, name),
          session:attendance_sessions(id, title, scheduled_date),
          assignment:assignments(id, title)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProgramVideo[];
    },
    enabled: !!tenant?.id,
  });
}

// Fetch single video with details
export function useVideo(videoId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["video", tenant?.id, videoId],
    queryFn: async () => {
      if (!tenant?.id || !videoId) return null;

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_videos")
        .select(`
          *,
          program:cohorts(id, name),
          session:attendance_sessions(id, title, scheduled_date),
          assignment:assignments(id, title)
        `)
        .eq("id", videoId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as ProgramVideo;
    },
    enabled: !!tenant?.id && !!videoId,
  });
}

// Create video
export function useCreateVideo() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVideoInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_videos")
        .insert({
          tenant_id: tenant.id,
          program_id: input.program_id,
          title: input.title,
          description: input.description || null,
          video_url: input.video_url,
          video_source: input.video_source || "external",
          duration_seconds: input.duration_seconds || null,
          thumbnail_url: input.thumbnail_url || null,
          session_id: input.session_id || null,
          requires_coursework: input.requires_coursework || false,
          coursework_assignment_id: input.coursework_assignment_id || null,
          minimum_watch_percentage: input.minimum_watch_percentage ?? 90,
          grants_virtual_attendance: input.grants_virtual_attendance ?? true,
          prevent_skipping: input.prevent_skipping || false,
          sort_order: input.sort_order || 0,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProgramVideo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["program-videos", tenant?.id, variables.program_id] });
      queryClient.invalidateQueries({ queryKey: ["all-program-videos"] });
      queryClient.invalidateQueries({ queryKey: ["student-videos"] });
    },
  });
}

// Update video
export function useUpdateVideo() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateVideoInput & { id: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_videos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProgramVideo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-videos"] });
      queryClient.invalidateQueries({ queryKey: ["all-program-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video"] });
      queryClient.invalidateQueries({ queryKey: ["student-videos"] });
    },
  });
}

// Delete video
export function useDeleteVideo() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("program_videos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-videos"] });
      queryClient.invalidateQueries({ queryKey: ["all-program-videos"] });
      queryClient.invalidateQueries({ queryKey: ["student-videos"] });
    },
  });
}

// ========== Video Progress & Watch Tracking ==========

// Fetch video progress for a specific video (instructor view)
export function useVideoProgress(videoId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["video-progress", tenant?.id, videoId],
    queryFn: async () => {
      if (!tenant?.id || !videoId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("video_progress")
        .select("*")
        .eq("video_id", videoId)
        .eq("tenant_id", tenant.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch user info separately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userIds = (data || []).map((p: any) => p.user_id);
      const { data: users } = userIds.length > 0
        ? await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", userIds)
        : { data: [] };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((progress: any) => ({
        ...progress,
        user: userMap.get(progress.user_id) || null,
      })) as VideoProgress[];
    },
    enabled: !!tenant?.id && !!videoId,
  });
}

// Get video statistics
export function useVideoStatistics(videoId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["video-statistics", tenant?.id, videoId],
    queryFn: async () => {
      if (!tenant?.id || !videoId) return null;

      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_video_statistics", {
        p_video_id: videoId,
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      return (data?.[0] || {
        total_viewers: 0,
        completed_count: 0,
        average_watch_percentage: 0,
        virtual_attendance_count: 0,
      }) as VideoStatistics;
    },
    enabled: !!tenant?.id && !!videoId,
  });
}

// Update video progress (student watching)
export function useUpdateVideoProgress() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      video_id: string;
      watch_time_seconds: number;
      last_position_seconds: number;
      duration_seconds: number;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase.rpc("update_video_progress", {
        p_video_id: input.video_id,
        p_user_id: user.id,
        p_tenant_id: tenant.id,
        p_watch_time_seconds: input.watch_time_seconds,
        p_last_position_seconds: input.last_position_seconds,
        p_duration_seconds: input.duration_seconds,
      });

      if (error) throw error;
      return data as {
        success: boolean;
        watch_percentage: number;
        completed: boolean;
        virtual_attendance_granted: boolean;
        message?: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-progress"] });
      queryClient.invalidateQueries({ queryKey: ["video-statistics"] });
    },
  });
}

// ========== Student Video View ==========

// Fetch all videos for a student
export function useStudentVideos() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-videos", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_student_videos", {
        p_student_id: user.id,
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      return (data || []) as StudentVideo[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Fetch single video for student with progress
export function useStudentVideo(videoId: string | null) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-video", tenant?.id, user?.id, videoId],
    queryFn: async () => {
      if (!tenant?.id || !user?.id || !videoId) return null;

      const supabase = getDb();

      // Get video
      const { data: video, error: videoError } = await supabase
        .from("program_videos")
        .select(`
          *,
          program:cohorts(id, name),
          session:attendance_sessions(id, title, scheduled_date)
        `)
        .eq("id", videoId)
        .eq("is_active", true)
        .single();

      if (videoError) throw videoError;

      // Get progress
      const { data: progress } = await supabase
        .from("video_progress")
        .select("*")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .single();

      return {
        ...video,
        watch_percentage: progress?.watch_percentage || 0,
        completed: progress?.completed || false,
        completed_at: progress?.completed_at || null,
        virtual_attendance_granted: progress?.virtual_attendance_granted || false,
        last_position_seconds: progress?.last_position_seconds || 0,
        watch_time_seconds: progress?.watch_time_seconds || 0,
      } as StudentVideo & { watch_time_seconds: number };
    },
    enabled: !!tenant?.id && !!user?.id && !!videoId,
  });
}

// ========== Helpers ==========

// Get video source label
export function getVideoSourceLabel(source: string): string {
  return VIDEO_SOURCES.find((s) => s.value === source)?.label || source;
}

// Format duration for display
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Parse YouTube video ID from URL
export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Parse Vimeo video ID from URL
export function parseVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

// Get embed URL for video
export function getEmbedUrl(url: string, source: string): string {
  if (source === "youtube") {
    const videoId = parseYouTubeId(url);
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  } else if (source === "vimeo") {
    const videoId = parseVimeoId(url);
    if (videoId) return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
}

// Detect video source from URL
export function detectVideoSource(url: string): VideoSource {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("supabase") || url.includes("storage")) return "upload";
  return "external";
}

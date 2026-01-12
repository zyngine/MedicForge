"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

export interface Announcement {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  publish_at: string | null;
  created_at: string;
  // Joined fields
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  course?: {
    id: string;
    title: string;
  };
}

export interface CreateAnnouncementInput {
  course_id: string;
  title: string;
  content: string;
  is_pinned?: boolean;
  publish_at?: string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  is_pinned?: boolean;
  publish_at?: string | null;
}

// Fetch announcements for a course
export function useAnnouncements(courseId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["announcements", tenant?.id, courseId],
    queryFn: async () => {
      if (!tenant?.id || !courseId) return [];

      const supabase = createClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          author:users!announcements_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", tenant.id)
        .eq("course_id", courseId)
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!tenant?.id && !!courseId,
  });
}

// Fetch all announcements for instructor (across their courses)
export function useInstructorAnnouncements() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["instructor-announcements", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();

      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          author:users!announcements_author_id_fkey(id, full_name, avatar_url),
          course:courses(id, title)
        `)
        .eq("tenant_id", tenant.id)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Fetch all announcements for a student's enrolled courses
export function useStudentAnnouncements() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-announcements", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();
      const now = new Date().toISOString();

      // First get enrolled course IDs
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          author:users!announcements_author_id_fkey(id, full_name, avatar_url),
          course:courses(id, title)
        `)
        .eq("tenant_id", tenant.id)
        .in("course_id", courseIds)
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Create announcement
export function useCreateAnnouncement() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          tenant_id: tenant.id,
          course_id: input.course_id,
          title: input.title,
          content: input.content,
          author_id: user.id,
          is_pinned: input.is_pinned || false,
          publish_at: input.publish_at || null,
        })
        .select(`
          *,
          author:users!announcements_author_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["announcements", tenant?.id, variables.course_id] });
      queryClient.invalidateQueries({ queryKey: ["instructor-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["student-announcements"] });
    },
  });
}

// Update announcement
export function useUpdateAnnouncement() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAnnouncementInput & { id: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("announcements")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select(`
          *,
          author:users!announcements_author_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["student-announcements"] });
    },
  });
}

// Delete announcement
export function useDeleteAnnouncement() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = createClient();

      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["student-announcements"] });
    },
  });
}

// Toggle pin status
export function useToggleAnnouncementPin() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("announcements")
        .update({ is_pinned })
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-announcements"] });
    },
  });
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export interface Mention {
  id: string;
  tenant_id: string;
  post_id: string;
  mentioned_user_id: string;
  notified: boolean;
  created_at: string;
  post?: {
    id: string;
    content: string;
    thread_id: string;
    author_id: string;
    author?: {
      full_name: string;
      avatar_url: string | null;
    };
    thread?: {
      id: string;
      title: string;
      course_id: string;
    };
  };
}

export interface MentionSuggestion {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

// Hook for getting mentions for current user
export function useMyMentions() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchMentions = useCallback(async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("discussion_mentions")
        .select(`
          *,
          post:discussion_posts(
            id,
            content,
            thread_id,
            author_id,
            author:users!discussion_posts_author_id_fkey(full_name, avatar_url),
            thread:discussion_threads(id, title, course_id)
          )
        `)
        .eq("mentioned_user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMentions(data || []);
      setUnreadCount(data?.filter((m: Mention) => !m.notified).length || 0);
    } catch (err) {
      console.error("Failed to fetch mentions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  // Subscribe to real-time mention notifications
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`mentions:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_mentions",
          filter: `mentioned_user_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Fetch the full mention with relations
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from("discussion_mentions")
            .select(`
              *,
              post:discussion_posts(
                id,
                content,
                thread_id,
                author_id,
                author:users!discussion_posts_author_id_fkey(full_name, avatar_url),
                thread:discussion_threads(id, title, course_id)
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMentions((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, supabase]);

  const markAsRead = async (mentionId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("discussion_mentions")
        .update({ notified: true })
        .eq("id", mentionId);

      if (error) throw error;

      setMentions((prev) =>
        prev.map((m) => (m.id === mentionId ? { ...m, notified: true } : m))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      console.error("Failed to mark mention as read:", err);
      return false;
    }
  };

  const markAllAsRead = async (): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("discussion_mentions")
        .update({ notified: true })
        .eq("mentioned_user_id", profile.id)
        .eq("notified", false);

      if (error) throw error;

      setMentions((prev) => prev.map((m) => ({ ...m, notified: true })));
      setUnreadCount(0);
      return true;
    } catch (err) {
      console.error("Failed to mark all mentions as read:", err);
      return false;
    }
  };

  return {
    mentions,
    unreadCount,
    isLoading,
    refetch: fetchMentions,
    markAsRead,
    markAllAsRead,
  };
}

// Hook for getting mention suggestions (users to @mention)
export function useMentionSuggestions(courseId: string) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSuggestions = useCallback(async () => {
    if (!profile?.tenant_id || !courseId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get course instructor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course } = await (supabase as any)
        .from("courses")
        .select("instructor_id")
        .eq("id", courseId)
        .single();

      // Get enrolled students and instructor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      const userIds = [
        ...(enrollments?.map((e: { student_id: string }) => e.student_id) || []),
        course?.instructor_id,
      ].filter(Boolean);

      // Get user details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: users, error } = await (supabase as any)
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .in("id", userIds)
        .neq("id", profile.id); // Exclude current user

      if (error) throw error;
      setSuggestions(users || []);
    } catch (err) {
      console.error("Failed to fetch mention suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, courseId, supabase]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Search suggestions by name
  const searchSuggestions = (query: string): MentionSuggestion[] => {
    if (!query) return suggestions;
    const lowerQuery = query.toLowerCase();
    return suggestions.filter(
      (s) =>
        s.full_name.toLowerCase().includes(lowerQuery) ||
        s.email.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    suggestions,
    isLoading,
    searchSuggestions,
    refetch: fetchSuggestions,
  };
}

// Helper to parse @mentions from text
export function parseMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+|"[^"]+")/g;
  const matches = text.match(mentionRegex) || [];
  return matches.map((m) => m.slice(1).replace(/"/g, ""));
}

// Helper to highlight mentions in text
export function highlightMentions(text: string, className: string = "text-blue-600 font-medium"): string {
  return text.replace(
    /@([a-zA-Z0-9_]+|"[^"]+")/g,
    `<span class="${className}">$&</span>`
  );
}

// Helper to format mention for insertion
export function formatMention(user: MentionSuggestion): string {
  // Use quotes if name has spaces
  if (user.full_name.includes(" ")) {
    return `@"${user.full_name}"`;
  }
  // Otherwise use email prefix
  return `@${user.email.split("@")[0]}`;
}

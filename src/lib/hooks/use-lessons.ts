"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lesson, Module } from "@/types";

export interface LessonWithDetails extends Lesson {
  module?: Module;
}

type ContentType = "video" | "document" | "text" | "embed";

interface LessonForm {
  title: string;
  content_type?: ContentType;
  content?: any;
  video_url?: string;
  document_url?: string;
  duration_minutes?: number;
  order_index?: number;
  is_published?: boolean;
}

export function useLessons(moduleId: string | null) {
  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchLessons = useCallback(async () => {
    if (!moduleId) {
      setLessons([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;

      // Transform data to ensure required fields have defaults
      const transformedLessons: LessonWithDetails[] = (data || []).map((lesson: any) => ({
        ...lesson,
        content_type: lesson.content_type ?? "text",
        order_index: lesson.order_index ?? 0,
        is_published: lesson.is_published ?? false,
      }));

      setLessons(transformedLessons);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch lessons"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, moduleId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const createLesson = async (lessonData: LessonForm): Promise<Lesson | null> => {
    if (!moduleId) return null;

    try {
      // Get current user for tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Get next order index
      const maxOrderIndex = lessons.length > 0
        ? Math.max(...lessons.map(l => l.order_index))
        : -1;

      const { data, error: createError } = await supabase
        .from("lessons")
        .insert([{
          tenant_id: userData.tenant_id,
          module_id: moduleId,
          title: lessonData.title,
          content_type: lessonData.content_type || "text",
          content: lessonData.content || null,
          video_url: lessonData.video_url || null,
          document_url: lessonData.document_url || null,
          duration_minutes: lessonData.duration_minutes || null,
          order_index: lessonData.order_index ?? maxOrderIndex + 1,
          is_published: lessonData.is_published ?? false,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchLessons();
      return data as Lesson;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create lesson";
      setError(new Error(message));
      throw err;
    }
  };

  const updateLesson = async (
    lessonId: string,
    updates: Partial<LessonForm>
  ): Promise<Lesson | null> => {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content_type !== undefined) updateData.content_type = updates.content_type;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.video_url !== undefined) updateData.video_url = updates.video_url;
      if (updates.document_url !== undefined) updateData.document_url = updates.document_url;
      if (updates.duration_minutes !== undefined) updateData.duration_minutes = updates.duration_minutes;
      if (updates.order_index !== undefined) updateData.order_index = updates.order_index;
      if (updates.is_published !== undefined) updateData.is_published = updates.is_published;

      const { data, error: updateError } = await supabase
        .from("lessons")
        .update(updateData)
        .eq("id", lessonId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchLessons();
      return data as Lesson;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update lesson"));
      return null;
    }
  };

  const deleteLesson = async (lessonId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);

      if (deleteError) throw deleteError;

      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete lesson"));
      return false;
    }
  };

  const reorderLessons = async (orderedIds: string[]): Promise<boolean> => {
    try {
      // Update order_index for each lesson
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update({ order_index: update.order_index })
          .eq("id", update.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setLessons((prev) => {
        const lessonMap = new Map(prev.map((l) => [l.id, l]));
        return orderedIds
          .map((id, index) => {
            const lesson = lessonMap.get(id);
            return lesson ? { ...lesson, order_index: index } : null;
          })
          .filter((l): l is LessonWithDetails => l !== null);
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reorder lessons"));
      return false;
    }
  };

  const publishLesson = async (lessonId: string): Promise<boolean> => {
    return (await updateLesson(lessonId, { is_published: true })) !== null;
  };

  const unpublishLesson = async (lessonId: string): Promise<boolean> => {
    return (await updateLesson(lessonId, { is_published: false })) !== null;
  };

  return {
    lessons,
    isLoading,
    error,
    refetch: fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    publishLesson,
    unpublishLesson,
  };
}

// Hook for getting a single lesson with its module
export function useLesson(lessonId: string | null) {
  const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchLesson = useCallback(async () => {
    if (!lessonId) {
      setLesson(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("lessons")
        .select(`
          *,
          module:modules(*)
        `)
        .eq("id", lessonId)
        .single();

      if (fetchError) throw fetchError;

      const transformedLesson = {
        ...data,
        content_type: data.content_type ?? "text",
        order_index: data.order_index ?? 0,
        is_published: data.is_published ?? false,
        module: data.module ? {
          ...data.module,
          order_index: data.module.order_index ?? 0,
          is_published: data.module.is_published ?? false,
        } as Module : undefined,
      } as LessonWithDetails;

      setLesson(transformedLesson);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch lesson"));
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, supabase]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  return { lesson, isLoading, error, refetch: fetchLesson };
}

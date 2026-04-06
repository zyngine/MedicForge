"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import type { Database } from "@/types/database.types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Module = Database["public"]["Tables"]["modules"]["Row"];

export interface LessonWithDetails extends Lesson {
  module?: Module;
}

type ContentType = "video" | "document" | "text" | "embed";

interface LessonForm {
  title: string;
  content_type?: ContentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any;
  video_url?: string;
  document_url?: string;
  duration_minutes?: number;
  order_index?: number;
  is_published?: boolean;
}

/**
 * Get lessons for a module
 */
export function useLessons(moduleId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["lessons", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      // Transform data to ensure required fields have defaults
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((lesson: any) => ({
        ...lesson,
        content_type: lesson.content_type ?? "text",
        order_index: lesson.order_index ?? 0,
        is_published: lesson.is_published ?? false,
      })) as LessonWithDetails[];
    },
    enabled: !!moduleId && !!tenant?.id,
  });
}

/**
 * Get a single lesson with its module
 */
export function useLesson(lessonId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          *,
          module:modules(*)
        `)
        .eq("id", lessonId)
        .single();

      if (error) throw error;

      return {
        ...data,
        content_type: data.content_type ?? "text",
        order_index: data.order_index ?? 0,
        is_published: data.is_published ?? false,
        module: data.module ? {
          ...data.module,
          order_index: data.module.order_index ?? 0,
          is_published: data.module.is_published ?? false,
        } : undefined,
      } as LessonWithDetails;
    },
    enabled: !!lessonId && !!tenant?.id,
  });
}

/**
 * Create a new lesson
 */
export function useCreateLesson() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: LessonForm;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Get next order index if not provided
      let orderIndex = data.order_index;
      if (orderIndex === undefined) {
        const { data: existingLessons } = await supabase
          .from("lessons")
          .select("order_index")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: false })
          .limit(1);

        orderIndex = existingLessons && existingLessons.length > 0 && existingLessons[0].order_index !== null
          ? existingLessons[0].order_index + 1
          : 0;
      }

      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          tenant_id: tenant.id,
          module_id: moduleId,
          title: data.title,
          content_type: data.content_type || "text",
          content: data.content || null,
          video_url: data.video_url || null,
          document_url: data.document_url || null,
          duration_minutes: data.duration_minutes || null,
          order_index: orderIndex,
          is_published: data.is_published ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return lesson;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Update a lesson
 */
export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: Partial<LessonForm>;
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content_type !== undefined) updateData.content_type = data.content_type;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.video_url !== undefined) updateData.video_url = data.video_url;
      if (data.document_url !== undefined) updateData.document_url = data.document_url;
      if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes;
      if (data.order_index !== undefined) updateData.order_index = data.order_index;
      if (data.is_published !== undefined) updateData.is_published = data.is_published;

      const { data: lesson, error } = await supabase
        .from("lessons")
        .update(updateData)
        .eq("id", lessonId)
        .select()
        .single();

      if (error) throw error;
      return lesson;
    },
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", lesson.module_id] });
      queryClient.invalidateQueries({ queryKey: ["lesson", lesson.id] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Delete a lesson
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const supabase = createClient();

      // Get the module_id before deleting
      const { data: lesson } = await supabase
        .from("lessons")
        .select("module_id")
        .eq("id", lessonId)
        .single();

      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;
      return { lessonId, moduleId: lesson?.module_id };
    },
    onSuccess: (result) => {
      if (result.moduleId) {
        queryClient.invalidateQueries({ queryKey: ["lessons", result.moduleId] });
      }
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
    },
  });
}

/**
 * Reorder lessons
 */
export function useReorderLessons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      orderedIds,
    }: {
      moduleId: string;
      orderedIds: string[];
    }) => {
      const supabase = createClient();

      // Update order_index for each lesson
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("lessons")
          .update({ order_index: i })
          .eq("id", orderedIds[i]);

        if (error) throw error;
      }

      return { moduleId, orderedIds };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", result.moduleId] });
    },
  });
}

/**
 * Publish a lesson
 */
export function usePublishLesson() {
  const { mutateAsync: updateLesson } = useUpdateLesson();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      return updateLesson({
        lessonId,
        data: { is_published: true },
      });
    },
  });
}

/**
 * Unpublish a lesson
 */
export function useUnpublishLesson() {
  const { mutateAsync: updateLesson } = useUpdateLesson();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      return updateLesson({
        lessonId,
        data: { is_published: false },
      });
    },
  });
}

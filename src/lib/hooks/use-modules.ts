"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import type { Database } from "@/types/database.types";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type _ModuleInsert = Database["public"]["Tables"]["modules"]["Insert"];

export interface ModuleWithDetails extends Module {
  lessons?: {
    id: string;
    title: string;
    content_type: string;
    order_index: number;
    is_published: boolean;
    duration_minutes: number | null;
  }[];
  assignments?: {
    id: string;
    title: string;
    type: string;
    due_date: string | null;
    points_possible: number | null;
    is_published: boolean;
  }[];
  lessons_count?: number;
  lesson_count?: number; // Alias for backward compatibility
  assignments_count?: number;
  assignment_count?: number; // Alias for backward compatibility
}

interface ModuleForm {
  title: string;
  description?: string;
  order_index?: number;
  unlock_date?: string;
  is_published?: boolean;
}

/**
 * Get modules for a course
 */
export function useModules(courseId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(count),
          assignments:assignments(count)
        `)
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      // Transform data to include computed fields with backward compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((module: any) => {
        const lessonsCount = module.lessons?.[0]?.count || 0;
        const assignmentsCount = module.assignments?.[0]?.count || 0;
        return {
          ...module,
          lessons_count: lessonsCount,
          lesson_count: lessonsCount,
          assignments_count: assignmentsCount,
          assignment_count: assignmentsCount,
        };
      }) as ModuleWithDetails[];
    },
    enabled: !!courseId && !!tenant?.id,
  });
}

/**
 * Get a single module with lessons and assignments
 */
export function useModule(moduleId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(
            id,
            title,
            content_type,
            order_index,
            is_published,
            duration_minutes
          ),
          assignments:assignments(
            id,
            title,
            type,
            due_date,
            points_possible,
            is_published
          )
        `)
        .eq("id", moduleId)
        .single();

      if (error) throw error;

      // Sort lessons and assignments by order_index
      const sortedLessons = (data.lessons || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((lesson: any) => ({
          ...lesson,
          content_type: lesson.content_type ?? "text",
          order_index: lesson.order_index ?? 0,
          is_published: lesson.is_published ?? false,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a.order_index - b.order_index);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortedAssignments = (data.assignments || []).map((assignment: any) => ({
        ...assignment,
        type: assignment.type ?? "quiz",
      }));

      const lessonsCount = sortedLessons.length;
      const assignmentsCount = sortedAssignments.length;

      return {
        ...data,
        order_index: data.order_index ?? 0,
        is_published: data.is_published ?? false,
        lessons: sortedLessons,
        assignments: sortedAssignments,
        lessons_count: lessonsCount,
        lesson_count: lessonsCount,
        assignments_count: assignmentsCount,
        assignment_count: assignmentsCount,
      } as ModuleWithDetails;
    },
    enabled: !!moduleId && !!tenant?.id,
  });
}

/**
 * Create a new module
 */
export function useCreateModule() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: string;
      data: ModuleForm;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      // Get next order index if not provided
      let orderIndex = data.order_index;
      if (orderIndex === undefined) {
        const { data: existingModules } = await supabase
          .from("modules")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        orderIndex = existingModules && existingModules.length > 0 && existingModules[0].order_index !== null
          ? existingModules[0].order_index + 1
          : 0;
      }

      const { data: module, error } = await supabase
        .from("modules")
        .insert({
          tenant_id: tenant.id,
          course_id: courseId,
          title: data.title,
          description: data.description || null,
          order_index: orderIndex,
          unlock_date: data.unlock_date || null,
          is_published: data.is_published ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return module;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["modules", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Update a module
 */
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: Partial<ModuleForm>;
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.order_index !== undefined) updateData.order_index = data.order_index;
      if (data.unlock_date !== undefined) updateData.unlock_date = data.unlock_date;
      if (data.is_published !== undefined) updateData.is_published = data.is_published;

      const { data: module, error } = await supabase
        .from("modules")
        .update(updateData)
        .eq("id", moduleId)
        .select()
        .single();

      if (error) throw error;
      return module;
    },
    onSuccess: (module) => {
      queryClient.invalidateQueries({ queryKey: ["modules", module.course_id] });
      queryClient.invalidateQueries({ queryKey: ["module", module.id] });
    },
  });
}

/**
 * Delete a module
 */
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const supabase = createClient();

      // Get the course_id before deleting
      const { data: module } = await supabase
        .from("modules")
        .select("course_id")
        .eq("id", moduleId)
        .single();

      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
      return { moduleId, courseId: module?.course_id };
    },
    onSuccess: (result) => {
      if (result.courseId) {
        queryClient.invalidateQueries({ queryKey: ["modules", result.courseId] });
      }
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Reorder modules
 */
export function useReorderModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      orderedIds,
    }: {
      courseId: string;
      orderedIds: string[];
    }) => {
      const supabase = createClient();

      // Update order_index for each module
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("modules")
          .update({ order_index: i })
          .eq("id", orderedIds[i]);

        if (error) throw error;
      }

      return { courseId, orderedIds };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["modules", result.courseId] });
    },
  });
}

/**
 * Publish a module
 */
export function usePublishModule() {
  const { mutateAsync: updateModule } = useUpdateModule();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      return updateModule({
        moduleId,
        data: { is_published: true },
      });
    },
  });
}

/**
 * Unpublish a module
 */
export function useUnpublishModule() {
  const { mutateAsync: updateModule } = useUpdateModule();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      return updateModule({
        moduleId,
        data: { is_published: false },
      });
    },
  });
}

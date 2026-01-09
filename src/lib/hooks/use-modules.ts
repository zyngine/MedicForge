"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Module, Lesson, Assignment } from "@/types";

export interface ModuleWithDetails extends Module {
  lessons?: Lesson[];
  assignments?: Assignment[];
  lessons_count?: number;
  assignments_count?: number;
}

interface ModuleForm {
  title: string;
  description?: string;
  order_index?: number;
  unlock_date?: string;
  is_published?: boolean;
}

export function useModules(courseId: string | null) {
  const [modules, setModules] = useState<ModuleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchModules = useCallback(async () => {
    if (!courseId) {
      setModules([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(count),
          assignments:assignments(count)
        `)
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;

      // Transform data to include computed fields
      const transformedModules: ModuleWithDetails[] = (data || []).map((module: any) => ({
        ...module,
        lessons_count: module.lessons?.[0]?.count || 0,
        assignments_count: module.assignments?.[0]?.count || 0,
      }));

      setModules(transformedModules);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch modules"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, courseId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const createModule = async (moduleData: ModuleForm): Promise<Module | null> => {
    if (!courseId) return null;

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
      const maxOrderIndex = modules.length > 0
        ? Math.max(...modules.map(m => m.order_index))
        : -1;

      const { data, error: createError } = await supabase
        .from("modules")
        .insert([{
          tenant_id: userData.tenant_id,
          course_id: courseId,
          title: moduleData.title,
          description: moduleData.description || null,
          order_index: moduleData.order_index ?? maxOrderIndex + 1,
          unlock_date: moduleData.unlock_date || null,
          is_published: moduleData.is_published ?? false,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchModules();
      return data as Module;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create module";
      setError(new Error(message));
      throw err;
    }
  };

  const updateModule = async (
    moduleId: string,
    updates: Partial<ModuleForm>
  ): Promise<Module | null> => {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.order_index !== undefined) updateData.order_index = updates.order_index;
      if (updates.unlock_date !== undefined) updateData.unlock_date = updates.unlock_date;
      if (updates.is_published !== undefined) updateData.is_published = updates.is_published;

      const { data, error: updateError } = await supabase
        .from("modules")
        .update(updateData)
        .eq("id", moduleId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchModules();
      return data as Module;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update module"));
      return null;
    }
  };

  const deleteModule = async (moduleId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (deleteError) throw deleteError;

      setModules((prev) => prev.filter((module) => module.id !== moduleId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete module"));
      return false;
    }
  };

  const reorderModules = async (orderedIds: string[]): Promise<boolean> => {
    try {
      // Update order_index for each module
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("modules")
          .update({ order_index: update.order_index })
          .eq("id", update.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setModules((prev) => {
        const moduleMap = new Map(prev.map((m) => [m.id, m]));
        return orderedIds
          .map((id, index) => {
            const module = moduleMap.get(id);
            return module ? { ...module, order_index: index } : null;
          })
          .filter((m): m is ModuleWithDetails => m !== null);
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reorder modules"));
      return false;
    }
  };

  const publishModule = async (moduleId: string): Promise<boolean> => {
    return (await updateModule(moduleId, { is_published: true })) !== null;
  };

  const unpublishModule = async (moduleId: string): Promise<boolean> => {
    return (await updateModule(moduleId, { is_published: false })) !== null;
  };

  return {
    modules,
    isLoading,
    error,
    refetch: fetchModules,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
    publishModule,
    unpublishModule,
  };
}

// Hook for getting a single module with its lessons and assignments
export function useModule(moduleId: string | null) {
  const [module, setModule] = useState<ModuleWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchModule = useCallback(async () => {
    if (!moduleId) {
      setModule(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(*),
          assignments:assignments(*)
        `)
        .eq("id", moduleId)
        .single();

      if (fetchError) throw fetchError;

      // Transform lessons and assignments to ensure required fields have defaults
      const transformedLessons = (data.lessons || []).map((lesson: any) => ({
        ...lesson,
        content_type: lesson.content_type ?? "text",
        order_index: lesson.order_index ?? 0,
        is_published: lesson.is_published ?? false,
      })) as Lesson[];

      const transformedAssignments = (data.assignments || []).map((assignment: any) => ({
        ...assignment,
        type: assignment.type ?? "quiz",
      })) as Assignment[];

      const transformedModule = {
        ...data,
        order_index: data.order_index ?? 0,
        is_published: data.is_published ?? false,
        lessons: transformedLessons,
        assignments: transformedAssignments,
        lessons_count: transformedLessons.length,
        assignments_count: transformedAssignments.length,
      } as ModuleWithDetails;

      setModule(transformedModule);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch module"));
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, supabase]);

  useEffect(() => {
    fetchModule();
  }, [fetchModule]);

  return { module, isLoading, error, refetch: fetchModule };
}

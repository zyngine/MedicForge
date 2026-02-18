"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface CourseTemplate {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  course_type: string | null;
  template_data: {
    modules?: Array<{
      title: string;
      description?: string;
      order_index: number;
      lessons?: Array<{
        title: string;
        content_type: string;
        content?: unknown;
        order_index: number;
      }>;
    }>;
    assignments?: Array<{
      title: string;
      description?: string;
      type: string;
      points_possible: number;
      module_index?: number;
    }>;
    settings?: Record<string, unknown>;
  } | null;
  is_shared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: { id: string; full_name: string };
}

export interface BlueprintCourse {
  id: string;
  tenant_id: string;
  template_id: string;
  course_id: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  sync_settings: {
    sync_modules?: boolean;
    sync_lessons?: boolean;
    sync_assignments?: boolean;
    sync_settings?: boolean;
  } | null;
  created_at: string;
  // Joined
  template?: CourseTemplate;
  course?: { id: string; title: string };
}

export interface BlueprintSyncHistory {
  id: string;
  blueprint_id: string;
  sync_type: "full" | "partial" | "manual";
  changes_applied: Record<string, unknown> | null;
  synced_by: string;
  synced_at: string;
  // Joined
  syncer?: { id: string; full_name: string };
}

// Hook for managing course templates
export function useCourseTemplates() {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("course_templates")
        .select(`
          *,
          creator:users!course_templates_created_by_fkey(id, full_name)
        `)
        .or(`tenant_id.eq.${profile.tenant_id},is_shared.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch course templates:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: {
    title: string;
    description?: string;
    course_type?: string;
    template_data?: CourseTemplate["template_data"];
    is_shared?: boolean;
  }): Promise<CourseTemplate | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("course_templates")
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          description: input.description || null,
          course_type: input.course_type || null,
          template_data: input.template_data || null,
          is_shared: input.is_shared ?? false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => [data, ...prev]);
      toast.success("Template created");
      return data;
    } catch (err) {
      toast.error("Failed to create template");
      return null;
    }
  };

  const createFromCourse = async (
    courseId: string,
    title: string,
    options?: {
      includeModules?: boolean;
      includeLessons?: boolean;
      includeAssignments?: boolean;
    }
  ): Promise<CourseTemplate | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // Fetch course data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course, error: courseError } = await (supabase as any)
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      const templateData: CourseTemplate["template_data"] = {
        settings: course.settings,
      };

      // Fetch modules if requested
      if (options?.includeModules !== false) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: modules } = await (supabase as any)
          .from("modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        templateData.modules = modules?.map((m: { title: string; description: string; order_index: number }) => ({
          title: m.title,
          description: m.description,
          order_index: m.order_index,
        })) || [];

        // Fetch lessons for each module if requested
        if (options?.includeLessons !== false && modules) {
          for (let i = 0; i < modules.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: lessons } = await (supabase as any)
              .from("lessons")
              .select("*")
              .eq("module_id", modules[i].id)
              .order("order_index");

            templateData.modules![i].lessons = lessons?.map((l: { title: string; content_type: string; content: unknown; order_index: number }) => ({
              title: l.title,
              content_type: l.content_type,
              content: l.content,
              order_index: l.order_index,
            })) || [];
          }
        }
      }

      // Fetch assignments if requested
      if (options?.includeAssignments !== false) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase as any)
          .from("assignments")
          .select("*, module:modules(order_index)")
          .eq("course_id", courseId);

        templateData.assignments = assignments?.map((a: { title: string; description: string; type: string; points_possible: number; module?: { order_index: number } }) => ({
          title: a.title,
          description: a.description,
          type: a.type,
          points_possible: a.points_possible,
          module_index: a.module?.order_index,
        })) || [];
      }

      return createTemplate({
        title,
        description: course.description,
        course_type: course.course_type,
        template_data: templateData,
      });
    } catch (err) {
      toast.error("Failed to create template from course");
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<CourseTemplate>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("course_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      toast.success("Template updated");
      return true;
    } catch (err) {
      toast.error("Failed to update template");
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("course_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete template");
      return false;
    }
  };

  const duplicateTemplate = async (
    id: string,
    newTitle: string
  ): Promise<CourseTemplate | null> => {
    const original = templates.find((t) => t.id === id);
    if (!original) return null;

    return createTemplate({
      title: newTitle,
      description: original.description || undefined,
      course_type: original.course_type || undefined,
      template_data: original.template_data,
      is_shared: false,
    });
  };

  const updateFromCourse = async (
    templateId: string,
    courseId: string,
    options?: {
      includeModules?: boolean;
      includeLessons?: boolean;
      includeAssignments?: boolean;
    }
  ): Promise<boolean> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return false;
    }

    try {
      // Fetch course data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course, error: courseError } = await (supabase as any)
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      const templateData: CourseTemplate["template_data"] = {
        settings: course.settings,
      };

      // Fetch modules if requested
      if (options?.includeModules !== false) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: modules } = await (supabase as any)
          .from("modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        templateData.modules = modules?.map((m: { title: string; description: string; order_index: number }) => ({
          title: m.title,
          description: m.description,
          order_index: m.order_index,
        })) || [];

        // Fetch lessons for each module if requested
        if (options?.includeLessons !== false && modules) {
          for (let i = 0; i < modules.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: lessons } = await (supabase as any)
              .from("lessons")
              .select("*")
              .eq("module_id", modules[i].id)
              .order("order_index");

            templateData.modules![i].lessons = lessons?.map((l: { title: string; content_type: string; content: unknown; order_index: number }) => ({
              title: l.title,
              content_type: l.content_type,
              content: l.content,
              order_index: l.order_index,
            })) || [];
          }
        }
      }

      // Fetch assignments if requested
      if (options?.includeAssignments !== false) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase as any)
          .from("assignments")
          .select("*, module:modules(order_index)")
          .eq("course_id", courseId);

        templateData.assignments = assignments?.map((a: { title: string; description: string; type: string; points_possible: number; module?: { order_index: number } }) => ({
          title: a.title,
          description: a.description,
          type: a.type,
          points_possible: a.points_possible,
          module_index: a.module?.order_index,
        })) || [];
      }

      // Update the template with new data
      return updateTemplate(templateId, {
        template_data: templateData,
        description: course.description,
        course_type: course.course_type,
      });
    } catch (err) {
      toast.error("Failed to update template from course");
      return false;
    }
  };

  const toggleShared = async (id: string): Promise<boolean> => {
    const template = templates.find((t) => t.id === id);
    if (!template) return false;
    return updateTemplate(id, { is_shared: !template.is_shared });
  };

  return {
    templates,
    isLoading,
    refetch: fetchTemplates,
    createTemplate,
    createFromCourse,
    updateFromCourse,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleShared,
  };
}

// Hook for blueprint courses (linked to templates)
export function useBlueprintCourses(templateId?: string) {
  const [blueprints, setBlueprintCourses] = useState<BlueprintCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchBlueprints = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("blueprint_courses")
        .select(`
          *,
          template:course_templates(id, title),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (templateId) {
        query = query.eq("template_id", templateId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setBlueprintCourses(data || []);
    } catch (err) {
      console.error("Failed to fetch blueprint courses:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, templateId, supabase]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const linkCourse = async (
    templateId: string,
    courseId: string,
    syncSettings?: BlueprintCourse["sync_settings"]
  ): Promise<BlueprintCourse | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("blueprint_courses")
        .insert({
          tenant_id: profile.tenant_id,
          template_id: templateId,
          course_id: courseId,
          sync_enabled: true,
          sync_settings: syncSettings || {
            sync_modules: true,
            sync_lessons: true,
            sync_assignments: true,
            sync_settings: false,
          },
        })
        .select(`
          *,
          template:course_templates(id, title),
          course:courses(id, title)
        `)
        .single();

      if (error) throw error;
      setBlueprintCourses((prev) => [data, ...prev]);
      toast.success("Course linked to blueprint");
      return data;
    } catch (err) {
      toast.error("Failed to link course");
      return null;
    }
  };

  const unlinkCourse = async (blueprintId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("blueprint_courses")
        .delete()
        .eq("id", blueprintId);

      if (error) throw error;
      setBlueprintCourses((prev) => prev.filter((b) => b.id !== blueprintId));
      toast.success("Course unlinked from blueprint");
      return true;
    } catch (err) {
      toast.error("Failed to unlink course");
      return false;
    }
  };

  const toggleSync = async (blueprintId: string): Promise<boolean> => {
    const blueprint = blueprints.find((b) => b.id === blueprintId);
    if (!blueprint) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("blueprint_courses")
        .update({ sync_enabled: !blueprint.sync_enabled })
        .eq("id", blueprintId);

      if (error) throw error;
      setBlueprintCourses((prev) =>
        prev.map((b) =>
          b.id === blueprintId ? { ...b, sync_enabled: !b.sync_enabled } : b
        )
      );
      return true;
    } catch (err) {
      return false;
    }
  };

  const updateSyncSettings = async (
    blueprintId: string,
    settings: BlueprintCourse["sync_settings"]
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("blueprint_courses")
        .update({ sync_settings: settings })
        .eq("id", blueprintId);

      if (error) throw error;
      setBlueprintCourses((prev) =>
        prev.map((b) =>
          b.id === blueprintId ? { ...b, sync_settings: settings } : b
        )
      );
      toast.success("Sync settings updated");
      return true;
    } catch (err) {
      toast.error("Failed to update sync settings");
      return false;
    }
  };

  const syncNow = async (blueprintId: string): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const blueprint = blueprints.find((b) => b.id === blueprintId);
      if (!blueprint) throw new Error("Blueprint not found");

      // Fetch template data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: template, error: templateError } = await (supabase as any)
        .from("course_templates")
        .select("template_data")
        .eq("id", blueprint.template_id)
        .single();

      if (templateError) throw templateError;

      const changes: Record<string, unknown> = {};
      const settings = blueprint.sync_settings || {};

      // Sync modules
      if (settings.sync_modules && template.template_data?.modules) {
        // Delete existing modules and recreate from template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("modules")
          .delete()
          .eq("course_id", blueprint.course_id);

        for (const mod of template.template_data.modules) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newModule } = await (supabase as any)
            .from("modules")
            .insert({
              tenant_id: profile.tenant_id,
              course_id: blueprint.course_id,
              title: mod.title,
              description: mod.description,
              order_index: mod.order_index,
              is_published: true,
            })
            .select()
            .single();

          // Sync lessons within module
          if (settings.sync_lessons && mod.lessons && newModule) {
            for (const lesson of mod.lessons) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from("lessons")
                .insert({
                  tenant_id: profile.tenant_id,
                  module_id: newModule.id,
                  title: lesson.title,
                  content_type: lesson.content_type,
                  content: lesson.content,
                  order_index: lesson.order_index,
                  is_published: true,
                });
            }
          }
        }
        changes.modules = template.template_data.modules.length;
      }

      // Record sync history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("blueprint_sync_history")
        .insert({
          blueprint_id: blueprintId,
          sync_type: "manual",
          changes_applied: changes,
          synced_by: profile.id,
        });

      // Update last synced timestamp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("blueprint_courses")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", blueprintId);

      await fetchBlueprints();
      toast.success("Blueprint synced successfully");
      return true;
    } catch (err) {
      toast.error("Failed to sync blueprint");
      return false;
    }
  };

  return {
    blueprints,
    isLoading,
    refetch: fetchBlueprints,
    linkCourse,
    unlinkCourse,
    toggleSync,
    updateSyncSettings,
    syncNow,
  };
}

// Hook for sync history
export function useBlueprintSyncHistory(blueprintId: string) {
  const [history, setHistory] = useState<BlueprintSyncHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.tenant_id || !blueprintId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("blueprint_sync_history")
          .select(`
            *,
            syncer:users!blueprint_sync_history_synced_by_fkey(id, full_name)
          `)
          .eq("blueprint_id", blueprintId)
          .order("synced_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error("Failed to fetch sync history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [profile?.tenant_id, blueprintId, supabase]);

  return { history, isLoading };
}

// Hook for applying template to create a new course
export function useApplyTemplate() {
  const { profile } = useUser();
  const supabase = createClient();

  const applyTemplate = async (
    templateId: string,
    courseData: {
      title: string;
      course_code?: string;
      start_date?: string;
      end_date?: string;
      max_students?: number;
    },
    linkAsBlueprint = false
  ): Promise<string | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // Fetch template
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: template, error: templateError } = await (supabase as any)
        .from("course_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Create course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course, error: courseError } = await (supabase as any)
        .from("courses")
        .insert({
          tenant_id: profile.tenant_id,
          title: courseData.title,
          description: template.description,
          course_code: courseData.course_code,
          course_type: template.course_type,
          instructor_id: profile.id,
          start_date: courseData.start_date,
          end_date: courseData.end_date,
          max_students: courseData.max_students,
          settings: template.template_data?.settings,
          is_active: true,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Create modules and lessons from template
      if (template.template_data?.modules) {
        for (const mod of template.template_data.modules) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newModule } = await (supabase as any)
            .from("modules")
            .insert({
              tenant_id: profile.tenant_id,
              course_id: course.id,
              title: mod.title,
              description: mod.description,
              order_index: mod.order_index,
              is_published: false,
            })
            .select()
            .single();

          if (mod.lessons && newModule) {
            for (const lesson of mod.lessons) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from("lessons")
                .insert({
                  tenant_id: profile.tenant_id,
                  module_id: newModule.id,
                  title: lesson.title,
                  content_type: lesson.content_type,
                  content: lesson.content,
                  order_index: lesson.order_index,
                  is_published: false,
                });
            }
          }
        }
      }

      // Link as blueprint if requested
      if (linkAsBlueprint) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("blueprint_courses")
          .insert({
            tenant_id: profile.tenant_id,
            template_id: templateId,
            course_id: course.id,
            sync_enabled: true,
            sync_settings: {
              sync_modules: true,
              sync_lessons: true,
              sync_assignments: true,
              sync_settings: false,
            },
          });
      }

      toast.success("Course created from template");
      return course.id;
    } catch (err) {
      toast.error("Failed to apply template");
      return null;
    }
  };

  return { applyTemplate };
}

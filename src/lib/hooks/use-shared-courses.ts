"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

// Course types/certification levels
export const CERTIFICATION_LEVELS = [
  { value: "emr", label: "EMR" },
  { value: "emt", label: "EMT" },
  { value: "aemt", label: "AEMT" },
  { value: "paramedic", label: "Paramedic" },
  { value: "general", label: "General" },
] as const;

// Popular tags for filtering
export const POPULAR_TAGS = [
  "anatomy",
  "physiology",
  "pharmacology",
  "cardiology",
  "trauma",
  "airway",
  "medical",
  "pediatrics",
  "obstetrics",
  "behavioral",
  "operations",
  "nremt-prep",
] as const;

export interface SharedCourse {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  course_type: string | null;
  share_description: string | null;
  share_tags: string[];
  clone_count: number;
  is_official: boolean;
  shared_at: string | null;
  tenant_id: string;
  tenant_name: string | null;
  module_count: number;
  lesson_count: number;
}

export interface CoursePreviewModule {
  module_id: string;
  module_title: string;
  module_description: string | null;
  module_order: number;
  lessons: {
    lesson_id: string;
    lesson_title: string;
    lesson_type: string;
    lesson_order: number;
  }[];
}

export interface CoursePreview {
  course_id: string;
  course_title: string;
  course_description: string | null;
  share_description: string | null;
  share_tags: string[];
  clone_count: number;
  is_official: boolean;
  tenant_name: string | null;
  modules: CoursePreviewModule[];
}

export interface CloneRecord {
  id: string;
  original_course_id: string;
  cloned_course_id: string;
  original_tenant_id: string;
  cloned_by_tenant_id: string;
  cloned_by_user_id: string;
  cloned_at: string;
}

// ========== Browse Shared Courses ==========

// Fetch shared courses with optional filters
export function useSharedCourses(options?: {
  search?: string;
  tags?: string[];
  certificationLevel?: string;
  sortBy?: "recent" | "popular" | "alphabetical";
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["shared-courses", options],
    queryFn: async () => {
      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_shared_courses", {
        p_search: options?.search || null,
        p_tags: options?.tags?.length ? options.tags : null,
        p_certification_level: options?.certificationLevel || null,
        p_sort_by: options?.sortBy || "recent",
        p_limit: options?.limit || 50,
        p_offset: options?.offset || 0,
      });

      if (error) throw error;
      return (data || []) as SharedCourse[];
    },
  });
}

// Fetch course preview (structure without content)
export function useCoursePreview(courseId: string | null) {
  return useQuery({
    queryKey: ["course-preview", courseId],
    queryFn: async () => {
      if (!courseId) return null;

      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_course_preview", {
        p_course_id: courseId,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Transform flat data into nested structure
      const firstRow = data[0];
      const modulesMap = new Map<string, CoursePreviewModule>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((row: any) => {
        if (!row.module_id) return;

        if (!modulesMap.has(row.module_id)) {
          modulesMap.set(row.module_id, {
            module_id: row.module_id,
            module_title: row.module_title,
            module_description: row.module_description,
            module_order: row.module_order,
            lessons: [],
          });
        }

        if (row.lesson_id) {
          modulesMap.get(row.module_id)!.lessons.push({
            lesson_id: row.lesson_id,
            lesson_title: row.lesson_title,
            lesson_type: row.lesson_type,
            lesson_order: row.lesson_order,
          });
        }
      });

      // Sort lessons within each module
      modulesMap.forEach((module) => {
        module.lessons.sort((a, b) => a.lesson_order - b.lesson_order);
      });

      const modules = Array.from(modulesMap.values()).sort(
        (a, b) => a.module_order - b.module_order
      );

      return {
        course_id: firstRow.course_id,
        course_title: firstRow.course_title,
        course_description: firstRow.course_description,
        share_description: firstRow.share_description,
        share_tags: firstRow.share_tags || [],
        clone_count: firstRow.clone_count,
        is_official: firstRow.is_official,
        tenant_name: firstRow.tenant_name,
        modules,
      } as CoursePreview;
    },
    enabled: !!courseId,
  });
}

// ========== Clone Course ==========

// Clone a course to own tenant
export function useCloneCourse() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceCourseId,
      newTitle,
    }: {
      sourceCourseId: string;
      newTitle?: string;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase.rpc("clone_course", {
        p_source_course_id: sourceCourseId,
        p_target_tenant_id: tenant.id,
        p_cloned_by_user_id: user.id,
        p_new_title: newTitle || null,
      });

      if (error) throw error;
      return data as string; // Returns new course ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
    },
  });
}

// ========== Manage Own Course Sharing ==========

// Toggle sharing status for a course
export function useToggleCourseSharing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      share,
      shareDescription,
      shareTags,
    }: {
      courseId: string;
      share: boolean;
      shareDescription?: string;
      shareTags?: string[];
    }) => {
      const supabase = getDb();

      const { data, error } = await supabase.rpc("toggle_course_sharing", {
        p_course_id: courseId,
        p_share: share,
        p_share_description: shareDescription || null,
        p_share_tags: shareTags || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course"] });
    },
  });
}

// Update sharing settings for a course
export function useUpdateCourseSharing() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      shareDescription,
      shareTags,
      sharePreviewEnabled,
    }: {
      courseId: string;
      shareDescription?: string;
      shareTags?: string[];
      sharePreviewEnabled?: boolean;
    }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("courses")
        .update({
          share_description: shareDescription,
          share_tags: shareTags,
          share_preview_enabled: sharePreviewEnabled,
        })
        .eq("id", courseId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course"] });
    },
  });
}

// ========== Get Clone History ==========

// Get clones made by own tenant
export function useMyClones() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["my-clones", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("course_clones")
        .select(`
          *,
          original_course:courses!course_clones_original_course_id_fkey(id, title, tenant_id),
          cloned_course:courses!course_clones_cloned_course_id_fkey(id, title)
        `)
        .eq("cloned_by_tenant_id", tenant.id)
        .order("cloned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });
}

// ========== Helpers ==========

// Get certification level label
export function getCertificationLabel(level: string): string {
  const found = CERTIFICATION_LEVELS.find((l) => l.value === level);
  return found?.label || level;
}

// Format clone count
export function formatCloneCount(count: number): string {
  if (count === 0) return "No clones yet";
  if (count === 1) return "1 clone";
  return `${count} clones`;
}

// Get lesson type icon name
export function getLessonTypeIcon(type: string): string {
  switch (type) {
    case "video":
      return "Play";
    case "document":
    case "reading":
      return "FileText";
    case "quiz":
      return "HelpCircle";
    case "assignment":
      return "ClipboardList";
    case "discussion":
      return "MessageSquare";
    default:
      return "BookOpen";
  }
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface Prerequisite {
  id: string;
  tenant_id: string;
  target_type: "module" | "lesson" | "assignment";
  target_id: string;
  prerequisite_type: "module" | "lesson" | "assignment" | "quiz_score";
  prerequisite_id: string;
  min_score: number | null;
  require_completion: boolean;
  created_at: string;
  // Joined
  target?: { id: string; title: string };
  prerequisite?: { id: string; title: string };
}

export interface ReleaseCondition {
  id: string;
  tenant_id: string;
  target_type: "module" | "lesson" | "assignment";
  target_id: string;
  condition_type: "date" | "score" | "completion" | "enrollment_date";
  condition_value: {
    date?: string;
    assignment_id?: string;
    min_score?: number;
    module_id?: string;
    lesson_id?: string;
    days_after_enrollment?: number;
  } | null;
  operator: "after" | "before" | "equals" | "greater_than" | "less_than" | null;
  created_at: string;
  // Joined
  target?: { id: string; title: string };
}

export interface StudentContentAccess {
  id: string;
  tenant_id: string;
  student_id: string;
  content_type: "module" | "lesson" | "assignment";
  content_id: string;
  is_accessible: boolean;
  reason: string | null;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

// Hook for managing prerequisites
export function usePrerequisites(targetType?: string, targetId?: string) {
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPrerequisites = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("prerequisites")
        .select("*")
        .eq("tenant_id", profile.tenant_id);

      if (targetType && targetId) {
        query = query.eq("target_type", targetType).eq("target_id", targetId);
      }

      const { data, error } = await query.order("created_at");
      if (error) throw error;
      setPrerequisites(data || []);
    } catch (err) {
      console.error("Failed to fetch prerequisites:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, targetType, targetId, supabase]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  const addPrerequisite = async (input: {
    target_type: Prerequisite["target_type"];
    target_id: string;
    prerequisite_type: Prerequisite["prerequisite_type"];
    prerequisite_id: string;
    min_score?: number;
    require_completion?: boolean;
  }): Promise<Prerequisite | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("prerequisites")
        .insert({
          tenant_id: profile.tenant_id,
          target_type: input.target_type,
          target_id: input.target_id,
          prerequisite_type: input.prerequisite_type,
          prerequisite_id: input.prerequisite_id,
          min_score: input.min_score || null,
          require_completion: input.require_completion ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      setPrerequisites((prev) => [...prev, data]);
      toast.success("Prerequisite added");
      return data;
    } catch (err) {
      toast.error("Failed to add prerequisite");
      return null;
    }
  };

  const removePrerequisite = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("prerequisites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPrerequisites((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prerequisite removed");
      return true;
    } catch (err) {
      toast.error("Failed to remove prerequisite");
      return false;
    }
  };

  const updatePrerequisite = async (
    id: string,
    updates: Partial<Prerequisite>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("prerequisites")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setPrerequisites((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      toast.success("Prerequisite updated");
      return true;
    } catch (err) {
      toast.error("Failed to update prerequisite");
      return false;
    }
  };

  return {
    prerequisites,
    isLoading,
    refetch: fetchPrerequisites,
    addPrerequisite,
    removePrerequisite,
    updatePrerequisite,
  };
}

// Hook for managing release conditions
export function useReleaseConditions(targetType?: string, targetId?: string) {
  const [conditions, setConditions] = useState<ReleaseCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchConditions = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("release_conditions")
        .select("*")
        .eq("tenant_id", profile.tenant_id);

      if (targetType && targetId) {
        query = query.eq("target_type", targetType).eq("target_id", targetId);
      }

      const { data, error } = await query.order("created_at");
      if (error) throw error;
      setConditions(data || []);
    } catch (err) {
      console.error("Failed to fetch release conditions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, targetType, targetId, supabase]);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  const addCondition = async (input: {
    target_type: ReleaseCondition["target_type"];
    target_id: string;
    condition_type: ReleaseCondition["condition_type"];
    condition_value: ReleaseCondition["condition_value"];
    operator?: ReleaseCondition["operator"];
  }): Promise<ReleaseCondition | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("release_conditions")
        .insert({
          tenant_id: profile.tenant_id,
          target_type: input.target_type,
          target_id: input.target_id,
          condition_type: input.condition_type,
          condition_value: input.condition_value,
          operator: input.operator || null,
        })
        .select()
        .single();

      if (error) throw error;
      setConditions((prev) => [...prev, data]);
      toast.success("Release condition added");
      return data;
    } catch (err) {
      toast.error("Failed to add release condition");
      return null;
    }
  };

  const removeCondition = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("release_conditions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setConditions((prev) => prev.filter((c) => c.id !== id));
      toast.success("Release condition removed");
      return true;
    } catch (err) {
      toast.error("Failed to remove release condition");
      return false;
    }
  };

  const updateCondition = async (
    id: string,
    updates: Partial<ReleaseCondition>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("release_conditions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      toast.success("Release condition updated");
      return true;
    } catch (err) {
      toast.error("Failed to update release condition");
      return false;
    }
  };

  // Helper to add common condition types
  const addDateCondition = async (
    targetType: ReleaseCondition["target_type"],
    targetId: string,
    date: string,
    operator: "after" | "before" = "after"
  ) => {
    return addCondition({
      target_type: targetType,
      target_id: targetId,
      condition_type: "date",
      condition_value: { date },
      operator,
    });
  };

  const addScoreCondition = async (
    targetType: ReleaseCondition["target_type"],
    targetId: string,
    assignmentId: string,
    minScore: number
  ) => {
    return addCondition({
      target_type: targetType,
      target_id: targetId,
      condition_type: "score",
      condition_value: { assignment_id: assignmentId, min_score: minScore },
      operator: "greater_than",
    });
  };

  const addCompletionCondition = async (
    targetType: ReleaseCondition["target_type"],
    targetId: string,
    completionTarget: { module_id?: string; lesson_id?: string }
  ) => {
    return addCondition({
      target_type: targetType,
      target_id: targetId,
      condition_type: "completion",
      condition_value: completionTarget,
      operator: "equals",
    });
  };

  return {
    conditions,
    isLoading,
    refetch: fetchConditions,
    addCondition,
    removeCondition,
    updateCondition,
    addDateCondition,
    addScoreCondition,
    addCompletionCondition,
  };
}

// Hook for checking student content access
export function useContentAccess(_courseId: string) {
  const [accessMap, setAccessMap] = useState<Record<string, StudentContentAccess>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchAccess = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("student_content_access")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("student_id", profile.id);

      if (error) throw error;

      const map: Record<string, StudentContentAccess> = {};
      for (const access of data || []) {
        map[`${access.content_type}:${access.content_id}`] = access;
      }
      setAccessMap(map);
    } catch (err) {
      console.error("Failed to fetch content access:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, supabase]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const canAccess = (contentType: string, contentId: string): boolean => {
    const key = `${contentType}:${contentId}`;
    const access = accessMap[key];
    // If no record exists, assume accessible (no restrictions)
    return access ? access.is_accessible : true;
  };

  const getAccessReason = (contentType: string, contentId: string): string | null => {
    const key = `${contentType}:${contentId}`;
    const access = accessMap[key];
    return access?.reason || null;
  };

  const checkPrerequisites = async (
    targetType: string,
    targetId: string
  ): Promise<{ met: boolean; missing: string[] }> => {
    if (!profile?.tenant_id || !profile?.id) {
      return { met: false, missing: ["Not logged in"] };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("check_prerequisites_met", {
          p_student_id: profile.id,
          p_target_type: targetType,
          p_target_id: targetId,
        });

      if (error) throw error;
      return { met: data === true, missing: data === true ? [] : ["Prerequisites not met"] };
    } catch (err) {
      console.error("Failed to check prerequisites:", err);
      return { met: false, missing: ["Error checking prerequisites"] };
    }
  };

  const refreshAccess = async (
    contentType: string,
    contentId: string
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    try {
      // Check prerequisites
      const prereqResult = await checkPrerequisites(contentType, contentId);

      // Check release conditions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conditions } = await (supabase as any)
        .from("release_conditions")
        .select("*")
        .eq("target_type", contentType)
        .eq("target_id", contentId);

      let conditionsMet = true;
      for (const condition of conditions || []) {
        if (condition.condition_type === "date") {
          const conditionDate = new Date(condition.condition_value?.date);
          const now = new Date();
          if (condition.operator === "after" && now < conditionDate) {
            conditionsMet = false;
          } else if (condition.operator === "before" && now > conditionDate) {
            conditionsMet = false;
          }
        }
        // Add other condition type checks as needed
      }

      const isAccessible = prereqResult.met && conditionsMet;
      const reason = !prereqResult.met
        ? "Prerequisites not met"
        : !conditionsMet
        ? "Release conditions not met"
        : null;

      // Update or create access record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("student_content_access")
        .upsert({
          tenant_id: profile.tenant_id,
          student_id: profile.id,
          content_type: contentType,
          content_id: contentId,
          is_accessible: isAccessible,
          reason,
          unlocked_at: isAccessible ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      await fetchAccess();
      return isAccessible;
    } catch (err) {
      console.error("Failed to refresh access:", err);
      return false;
    }
  };

  return {
    accessMap,
    isLoading,
    refetch: fetchAccess,
    canAccess,
    getAccessReason,
    checkPrerequisites,
    refreshAccess,
  };
}

// Hook for instructor to manage all prerequisites and conditions for a course
export function useCourseAccessSettings(courseId: string) {
  const [allPrerequisites, setAllPrerequisites] = useState<Prerequisite[]>([]);
  const [allConditions, setAllConditions] = useState<ReleaseCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchAll = async () => {
      if (!profile?.tenant_id || !courseId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get all modules for the course
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: modules } = await (supabase as any)
          .from("modules")
          .select("id")
          .eq("course_id", courseId);

        const moduleIds = modules?.map((m: { id: string }) => m.id) || [];

        // Get all lessons for these modules
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lessons } = await (supabase as any)
          .from("lessons")
          .select("id")
          .in("module_id", moduleIds);

        const lessonIds = lessons?.map((l: { id: string }) => l.id) || [];

        // Get all assignments for these modules
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase as any)
          .from("assignments")
          .select("id")
          .in("module_id", moduleIds);

        const assignmentIds = assignments?.map((a: { id: string }) => a.id) || [];

        const allIds = [...moduleIds, ...lessonIds, ...assignmentIds];

        // Fetch prerequisites
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: prereqs } = await (supabase as any)
          .from("prerequisites")
          .select("*")
          .in("target_id", allIds);

        setAllPrerequisites(prereqs || []);

        // Fetch release conditions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: conds } = await (supabase as any)
          .from("release_conditions")
          .select("*")
          .in("target_id", allIds);

        setAllConditions(conds || []);
      } catch (err) {
        console.error("Failed to fetch course access settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [profile?.tenant_id, courseId, supabase]);

  // Group by target
  const prerequisitesByTarget = allPrerequisites.reduce((acc, prereq) => {
    const key = `${prereq.target_type}:${prereq.target_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(prereq);
    return acc;
  }, {} as Record<string, Prerequisite[]>);

  const conditionsByTarget = allConditions.reduce((acc, cond) => {
    const key = `${cond.target_type}:${cond.target_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cond);
    return acc;
  }, {} as Record<string, ReleaseCondition[]>);

  return {
    allPrerequisites,
    allConditions,
    prerequisitesByTarget,
    conditionsByTarget,
    isLoading,
  };
}

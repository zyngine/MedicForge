"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export type CertificationLevel = "EMR" | "EMT" | "AEMT" | "Paramedic" | "Other";

export interface Skill {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category: string;
  skill_code: string | null;
  certification_levels: CertificationLevel[];
  is_required: boolean;
  requires_annual_verification: boolean;
  display_order: number;
  is_active: boolean;
  is_system_default: boolean;
  state_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillInput {
  name: string;
  description?: string;
  category: string;
  skill_code?: string;
  certification_levels: CertificationLevel[];
  is_required?: boolean;
  requires_annual_verification?: boolean;
  display_order?: number;
}

export interface SkillCategory {
  name: string;
  count: number;
  skills: Skill[];
}

/**
 * Get all skills in the skill library
 */
export function useSkillLibrary(options?: {
  category?: string;
  certificationLevel?: CertificationLevel;
  isActive?: boolean;
  requiresMdVerification?: boolean;
  isStateRequired?: boolean;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-library", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("skill_library")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }
      if (options?.category) {
        query = query.eq("category", options.category);
      }
      if (options?.requiresMdVerification !== undefined) {
        query = query.eq("requires_md_verification", options.requiresMdVerification);
      }
      if (options?.isStateRequired !== undefined) {
        query = query.eq("is_state_required", options.isStateRequired);
      }
      if (options?.certificationLevel) {
        query = query.contains("certification_levels", [options.certificationLevel]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as Skill[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single skill by ID
 */
export function useSkill(skillId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill", skillId],
    queryFn: async () => {
      if (!skillId || !tenant?.id) return null;

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .select("*")
        .eq("id", skillId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as Skill;
    },
    enabled: !!skillId && !!tenant?.id,
  });
}

/**
 * Get skills grouped by category
 */
export function useSkillsByCategory(options?: {
  certificationLevel?: CertificationLevel;
  isActive?: boolean;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skills-by-category", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      // Get both system defaults and tenant-specific skills
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("skill_library")
        .select("*")
        .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
        .order("category", { ascending: true })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }
      if (options?.certificationLevel) {
        query = query.contains("certification_levels", [options.certificationLevel]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, Skill[]>();
      (data || []).forEach((skill: Skill) => {
        const existing = categoryMap.get(skill.category) || [];
        existing.push(skill);
        categoryMap.set(skill.category, existing);
      });

      const categories: SkillCategory[] = [];
      categoryMap.forEach((skills, name) => {
        categories.push({ name, count: skills.length, skills });
      });

      return categories;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get all unique categories
 */
export function useSkillCategories() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-categories", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .select("category")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

      if (error) throw error;

      // Get unique categories
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categories = [...new Set((data || []).map((d: any) => d.category))];
      return categories.sort() as string[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Create a new skill
 */
export function useCreateSkill() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSkillInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .insert({
          ...input,
          tenant_id: tenant.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Update a skill
 */
export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      skillId,
      updates,
    }: {
      skillId: string;
      updates: Partial<CreateSkillInput> & { is_active?: boolean };
    }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .update(updates)
        .eq("id", skillId)
        .select()
        .single();

      if (error) throw error;
      return data as Skill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["skill", data.id] });
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Deactivate a skill (soft delete)
 */
export function useDeactivateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .update({ is_active: false })
        .eq("id", skillId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
    },
  });
}

/**
 * Reactivate a skill
 */
export function useReactivateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .update({ is_active: true })
        .eq("id", skillId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
    },
  });
}

/**
 * Delete a skill permanently
 */
export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("skill_library")
        .delete()
        .eq("id", skillId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Import skills from array (for bulk import)
 */
export function useImportSkills() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skills: CreateSkillInput[]) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .insert(
          skills.map((skill) => ({
            ...skill,
            tenant_id: tenant.id,
            is_active: true,
          }))
        )
        .select();

      if (error) throw error;
      return data as Skill[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-library"] });
      queryClient.invalidateQueries({ queryKey: ["skills-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Get skill library statistics
 */
export function useSkillLibraryStats() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-library-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();
      // Get both system defaults and tenant-specific skills
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: skills, error } = await (supabase as any)
        .from("skill_library")
        .select("id, category, certification_levels, is_required, requires_annual_verification, is_active, is_system_default")
        .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeSkills = skills?.filter((s: any) => s.is_active) || [];

      // Count by category
      const byCategory: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeSkills.forEach((s: any) => {
        byCategory[s.category] = (byCategory[s.category] || 0) + 1;
      });

      // Count by certification level
      const byCertLevel: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeSkills.forEach((s: any) => {
        (s.certification_levels || []).forEach((level: string) => {
          byCertLevel[level] = (byCertLevel[level] || 0) + 1;
        });
      });

      return {
        total: skills?.length || 0,
        active: activeSkills.length,
        inactive: (skills?.length || 0) - activeSkills.length,
        requiresMdVerification: 0, // Not tracked in this schema
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateRequired: activeSkills.filter((s: any) => s.is_required).length,
        byCategory,
        byCertificationLevel: byCertLevel,
        categoryCount: Object.keys(byCategory).length,
      };
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get skills that are due or expiring soon for a specific certification level
 */
export function useSkillsForCertification(certificationLevel: CertificationLevel) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skills-for-certification", tenant?.id, certificationLevel],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("skill_library")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .contains("certification_levels", [certificationLevel])
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Skill[];
    },
    enabled: !!tenant?.id && !!certificationLevel,
  });
}

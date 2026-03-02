"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

// Link categories for organizing resources
export const LINK_CATEGORIES = [
  { value: "certification", label: "Certification" },
  { value: "clinical", label: "Clinical" },
  { value: "uniforms", label: "Uniforms & Equipment" },
  { value: "resources", label: "Learning Resources" },
  { value: "forms", label: "Forms & Documents" },
  { value: "other", label: "Other" },
] as const;

export type LinkCategory = (typeof LINK_CATEGORIES)[number]["value"];

export interface ProgramLink {
  id: string;
  program_id: string;
  tenant_id: string;
  title: string;
  url: string;
  description: string | null;
  category: LinkCategory;
  icon: string | null;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  program?: {
    id: string;
    name: string;
  };
}

export interface TenantLink {
  id: string;
  tenant_id: string;
  title: string;
  url: string;
  description: string | null;
  category: LinkCategory;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramLinkInput {
  program_id: string;
  title: string;
  url: string;
  description?: string;
  category?: LinkCategory;
  icon?: string;
  sort_order?: number;
  is_required?: boolean;
}

export interface UpdateProgramLinkInput {
  title?: string;
  url?: string;
  description?: string;
  category?: LinkCategory;
  icon?: string;
  sort_order?: number;
  is_required?: boolean;
  is_active?: boolean;
}

export interface CreateTenantLinkInput {
  title: string;
  url: string;
  description?: string;
  category?: LinkCategory;
  icon?: string;
  sort_order?: number;
}

export interface UpdateTenantLinkInput {
  title?: string;
  url?: string;
  description?: string;
  category?: LinkCategory;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Student resource link (combined view)
export interface StudentLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  icon: string | null;
  sort_order: number;
  is_required: boolean;
  link_type: "program" | "tenant";
  program_name: string | null;
}

// ========== Program Links ==========

// Fetch program links for a specific program
export function useProgramLinks(programId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["program-links", tenant?.id, programId],
    queryFn: async () => {
      if (!tenant?.id || !programId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_links")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as ProgramLink[];
    },
    enabled: !!tenant?.id && !!programId,
  });
}

// Fetch all program links across all programs (admin view)
export function useAllProgramLinks() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["all-program-links", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_links")
        .select(`
          *,
          program:cohorts(id, name)
        `)
        .eq("tenant_id", tenant.id)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as ProgramLink[];
    },
    enabled: !!tenant?.id,
  });
}

// Create program link
export function useCreateProgramLink() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProgramLinkInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_links")
        .insert({
          tenant_id: tenant.id,
          program_id: input.program_id,
          title: input.title,
          url: input.url,
          description: input.description || null,
          category: input.category || "other",
          icon: input.icon || null,
          sort_order: input.sort_order || 0,
          is_required: input.is_required || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProgramLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["program-links", tenant?.id, variables.program_id] });
      queryClient.invalidateQueries({ queryKey: ["all-program-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// Update program link
export function useUpdateProgramLink() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProgramLinkInput & { id: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_links")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProgramLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-links"] });
      queryClient.invalidateQueries({ queryKey: ["all-program-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// Delete program link
export function useDeleteProgramLink() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("program_links")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-links"] });
      queryClient.invalidateQueries({ queryKey: ["all-program-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// ========== Tenant Links ==========

// Fetch tenant-wide links
export function useTenantLinks() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["tenant-links", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("tenant_links")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as TenantLink[];
    },
    enabled: !!tenant?.id,
  });
}

// Create tenant link
export function useCreateTenantLink() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTenantLinkInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("tenant_links")
        .insert({
          tenant_id: tenant.id,
          title: input.title,
          url: input.url,
          description: input.description || null,
          category: input.category || "other",
          icon: input.icon || null,
          sort_order: input.sort_order || 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TenantLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// Update tenant link
export function useUpdateTenantLink() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTenantLinkInput & { id: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("tenant_links")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as TenantLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// Delete tenant link
export function useDeleteTenantLink() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("tenant_links")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-links"] });
      queryClient.invalidateQueries({ queryKey: ["student-links"] });
    },
  });
}

// ========== Student View ==========

// Fetch all links for a student (program + tenant links combined)
export function useStudentLinks() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-links", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = getDb();

      // Use the database function to get all links
      const { data, error } = await supabase.rpc("get_student_links", {
        p_student_id: user.id,
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      return (data || []) as StudentLink[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Group links by category for display
export function groupLinksByCategory(links: StudentLink[]) {
  const grouped = new Map<string, StudentLink[]>();

  links.forEach((link) => {
    const category = link.category || "other";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(link);
  });

  // Sort categories and links within each category
  const categoryOrder = ["certification", "clinical", "uniforms", "resources", "forms", "other"];
  const sortedEntries = Array.from(grouped.entries()).sort((a, b) => {
    return categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]);
  });

  return new Map(sortedEntries);
}

// Get category label from value
export function getCategoryLabel(category: string): string {
  const found = LINK_CATEGORIES.find((c) => c.value === category);
  return found?.label || "Other";
}

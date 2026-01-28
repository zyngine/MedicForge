"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export interface AgencySettings {
  id: string;
  tenant_id: string;
  agency_name: string;
  agency_license_number: string | null;
  state: string;
  verification_frequency_months: number;
  require_md_signature: boolean;
  allow_supervisor_verification: boolean;
  notification_email: string | null;
  notification_days_before_expiry: number[];
  custom_skill_categories: string[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UpdateAgencySettingsInput {
  agency_name?: string;
  agency_license_number?: string;
  state?: string;
  verification_frequency_months?: number;
  require_md_signature?: boolean;
  allow_supervisor_verification?: boolean;
  notification_email?: string;
  notification_days_before_expiry?: number[];
  custom_skill_categories?: string[];
  settings?: Record<string, any>;
}

/**
 * Get agency settings for the current tenant
 */
export function useAgencySettings() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["agency-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as AgencySettings | null;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Create or update agency settings
 */
export function useUpsertAgencySettings() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAgencySettingsInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();

      // Check if settings exist
      const { data: existing } = await (supabase as any)
        .from("agency_settings")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await (supabase as any)
          .from("agency_settings")
          .update(input)
          .eq("tenant_id", tenant.id)
          .select()
          .single();

        if (error) throw error;
        return data as AgencySettings;
      } else {
        // Create new
        const { data, error } = await (supabase as any)
          .from("agency_settings")
          .insert({
            ...input,
            tenant_id: tenant.id,
            agency_name: input.agency_name || tenant.name,
            state: input.state || "PA",
          })
          .select()
          .single();

        if (error) throw error;
        return data as AgencySettings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
  });
}

/**
 * Update specific settings field
 */
export function useUpdateAgencySetting() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof UpdateAgencySettingsInput;
      value: any;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_settings")
        .update({ [key]: value })
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as AgencySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
  });
}

/**
 * Add a custom skill category
 */
export function useAddCustomCategory() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryName: string) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();

      // Get current settings
      const { data: settings } = await (supabase as any)
        .from("agency_settings")
        .select("custom_skill_categories")
        .eq("tenant_id", tenant.id)
        .single();

      const currentCategories = settings?.custom_skill_categories || [];

      if (currentCategories.includes(categoryName)) {
        throw new Error("Category already exists");
      }

      const { data, error } = await (supabase as any)
        .from("agency_settings")
        .update({
          custom_skill_categories: [...currentCategories, categoryName],
        })
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as AgencySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
  });
}

/**
 * Remove a custom skill category
 */
export function useRemoveCustomCategory() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryName: string) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();

      // Get current settings
      const { data: settings } = await (supabase as any)
        .from("agency_settings")
        .select("custom_skill_categories")
        .eq("tenant_id", tenant.id)
        .single();

      const currentCategories = settings?.custom_skill_categories || [];
      const updatedCategories = currentCategories.filter(
        (c: string) => c !== categoryName
      );

      const { data, error } = await (supabase as any)
        .from("agency_settings")
        .update({
          custom_skill_categories: updatedCategories,
        })
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as AgencySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
  });
}

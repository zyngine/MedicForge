"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClinicalSite, ClinicalSiteForm, Preceptor } from "@/types";

// Helper to transform database site to ClinicalSite type
const transformSite = (data: any): ClinicalSite => ({
  ...data,
  preceptors: (data.preceptors || []) as Preceptor[],
});

export function useClinicalSites() {
  const [sites, setSites] = useState<ClinicalSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("clinical_sites")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (fetchError) throw fetchError;

      setSites((data || []).map(transformSite));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch sites"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const createSite = async (siteData: ClinicalSiteForm): Promise<ClinicalSite | null> => {
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

      const { data, error: createError } = await supabase
        .from("clinical_sites")
        .insert([{
          ...siteData,
          preceptors: siteData.preceptors as any,
          tenant_id: userData.tenant_id,
        }])
        .select()
        .single();

      if (createError) throw createError;

      const site = transformSite(data);
      setSites((prev) => [...prev, site]);
      return site;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create site"));
      return null;
    }
  };

  const updateSite = async (
    siteId: string,
    updates: Partial<ClinicalSiteForm>
  ): Promise<ClinicalSite | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("clinical_sites")
        .update({
          ...updates,
          preceptors: updates.preceptors as any,
        })
        .eq("id", siteId)
        .select()
        .single();

      if (updateError) throw updateError;

      const site = transformSite(data);
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? site : s))
      );
      return site;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update site"));
      return null;
    }
  };

  const deleteSite = async (siteId: string): Promise<boolean> => {
    try {
      // Soft delete by setting is_active to false
      const { error: deleteError } = await supabase
        .from("clinical_sites")
        .update({ is_active: false })
        .eq("id", siteId);

      if (deleteError) throw deleteError;

      setSites((prev) => prev.filter((site) => site.id !== siteId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete site"));
      return false;
    }
  };

  return {
    sites,
    isLoading,
    error,
    refetch: fetchSites,
    createSite,
    updateSite,
    deleteSite,
  };
}

export function useClinicalSite(siteId: string | null) {
  const [site, setSite] = useState<ClinicalSite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      setIsLoading(false);
      return;
    }

    const fetchSite = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("clinical_sites")
          .select("*")
          .eq("id", siteId)
          .single();

        if (fetchError) throw fetchError;

        setSite(transformSite(data));
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch site"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSite();
  }, [siteId, supabase]);

  return { site, isLoading, error };
}

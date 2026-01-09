"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClinicalSite, ClinicalSiteForm } from "@/types";

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

      setSites(data || []);
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
      const { data, error: createError } = await supabase
        .from("clinical_sites")
        .insert([siteData])
        .select()
        .single();

      if (createError) throw createError;

      setSites((prev) => [...prev, data]);
      return data;
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
        .update(updates)
        .eq("id", siteId)
        .select()
        .single();

      if (updateError) throw updateError;

      setSites((prev) =>
        prev.map((site) => (site.id === siteId ? data : site))
      );
      return data;
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

        setSite(data);
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

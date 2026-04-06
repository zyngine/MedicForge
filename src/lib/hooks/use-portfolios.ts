"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type PortfolioType = "showcase" | "learning" | "assessment";
export type ArtifactType = "submission" | "file" | "link" | "text" | "image" | "video" | "certificate";

export interface Portfolio {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  portfolio_type: PortfolioType;
  is_public: boolean;
  is_published: boolean;
  published_at: string | null;
  theme: string;
  custom_css: string | null;
  cover_image_url: string | null;
  layout_config: Record<string, any>;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: { id: string; full_name: string; email: string };
  sections?: PortfolioSection[];
}

export interface PortfolioSection {
  id: string;
  tenant_id: string;
  portfolio_id: string;
  title: string;
  description: string | null;
  section_type: string;
  content: string | null;
  order_index: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  artifacts?: PortfolioArtifact[];
}

export interface PortfolioArtifact {
  id: string;
  tenant_id: string;
  section_id: string;
  title: string;
  description: string | null;
  artifact_type: ArtifactType;
  source_type: string | null;
  source_id: string | null;
  file_url: string | null;
  external_url: string | null;
  content: string | null;
  thumbnail_url: string | null;
  tags: string[];
  reflection: string | null;
  order_index: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioShare {
  id: string;
  tenant_id: string;
  portfolio_id: string;
  share_type: "link" | "email" | "user";
  share_token: string | null;
  shared_with_email: string | null;
  shared_with_user_id: string | null;
  permissions: "view" | "comment";
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

// Hook for managing portfolios
export function usePortfolios(ownerId?: string) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPortfolios = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    const targetOwnerId = ownerId || profile.id;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolios")
        .select(`
          *,
          owner:users!portfolios_owner_id_fkey(id, full_name, email)
        `)
        .eq("owner_id", targetOwnerId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (err) {
      console.error("Failed to fetch portfolios:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, ownerId, supabase]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const createPortfolio = async (input: {
    title: string;
    description?: string;
    portfolio_type?: PortfolioType;
    theme?: string;
    cover_image_url?: string;
  }): Promise<Portfolio | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolios")
        .insert({
          tenant_id: profile.tenant_id,
          owner_id: profile.id,
          title: input.title,
          description: input.description || null,
          portfolio_type: input.portfolio_type || "showcase",
          theme: input.theme || "default",
          cover_image_url: input.cover_image_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      setPortfolios((prev) => [data, ...prev]);
      toast.success("Portfolio created");
      return data;
    } catch (err) {
      toast.error("Failed to create portfolio");
      return null;
    }
  };

  const updatePortfolio = async (id: string, updates: Partial<Portfolio>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolios")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      toast.success("Portfolio updated");
      return true;
    } catch (err) {
      toast.error("Failed to update portfolio");
      return false;
    }
  };

  const deletePortfolio = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolios")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
      toast.success("Portfolio deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete portfolio");
      return false;
    }
  };

  const publishPortfolio = async (id: string): Promise<boolean> => {
    return updatePortfolio(id, {
      is_published: true,
      published_at: new Date().toISOString(),
    });
  };

  const unpublishPortfolio = async (id: string): Promise<boolean> => {
    return updatePortfolio(id, {
      is_published: false,
      published_at: null,
    });
  };

  const duplicatePortfolio = async (id: string, newTitle: string): Promise<Portfolio | null> => {
    const original = portfolios.find((p) => p.id === id);
    if (!original || !profile?.tenant_id || !profile?.id) return null;

    try {
      // Create new portfolio
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newPortfolio, error: portfolioError } = await (supabase as any)
        .from("portfolios")
        .insert({
          tenant_id: profile.tenant_id,
          owner_id: profile.id,
          title: newTitle,
          description: original.description,
          portfolio_type: original.portfolio_type,
          theme: original.theme,
          cover_image_url: original.cover_image_url,
          layout_config: original.layout_config,
          is_published: false,
        })
        .select()
        .single();

      if (portfolioError) throw portfolioError;

      // Copy sections and artifacts would happen in usePortfolioBuilder
      await fetchPortfolios();
      toast.success("Portfolio duplicated");
      return newPortfolio;
    } catch (err) {
      toast.error("Failed to duplicate portfolio");
      return null;
    }
  };

  return {
    portfolios,
    publishedPortfolios: portfolios.filter((p) => p.is_published),
    draftPortfolios: portfolios.filter((p) => !p.is_published),
    isLoading,
    refetch: fetchPortfolios,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    publishPortfolio,
    unpublishPortfolio,
    duplicatePortfolio,
  };
}

// Hook for building/editing a portfolio
export function usePortfolioBuilder(portfolioId: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPortfolio = useCallback(async () => {
    if (!profile?.tenant_id || !portfolioId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolios")
        .select(`
          *,
          sections:portfolio_sections(
            *,
            artifacts:portfolio_artifacts(*)
          )
        `)
        .eq("id", portfolioId)
        .single();

      if (error) throw error;

      // Sort sections and artifacts
      const sortedPortfolio = {
        ...data,
        sections: (data.sections || [])
          .sort((a: PortfolioSection, b: PortfolioSection) => a.order_index - b.order_index)
          .map((section: PortfolioSection) => ({
            ...section,
            artifacts: (section.artifacts || []).sort(
              (a: PortfolioArtifact, b: PortfolioArtifact) => a.order_index - b.order_index
            ),
          })),
      };

      setPortfolio(sortedPortfolio);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, portfolioId, supabase]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Section operations
  const addSection = async (input: {
    title: string;
    description?: string;
    section_type?: string;
    content?: string;
  }): Promise<PortfolioSection | null> => {
    if (!profile?.tenant_id || !portfolio) return null;

    const orderIndex = (portfolio.sections?.length || 0);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolio_sections")
        .insert({
          tenant_id: profile.tenant_id,
          portfolio_id: portfolioId,
          title: input.title,
          description: input.description || null,
          section_type: input.section_type || "custom",
          content: input.content || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPortfolio();
      return data;
    } catch (err) {
      toast.error("Failed to add section");
      return null;
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<PortfolioSection>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolio_sections")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", sectionId);

      if (error) throw error;
      await fetchPortfolio();
      return true;
    } catch (err) {
      toast.error("Failed to update section");
      return false;
    }
  };

  const deleteSection = async (sectionId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolio_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      await fetchPortfolio();
      return true;
    } catch (err) {
      toast.error("Failed to delete section");
      return false;
    }
  };

  const reorderSections = async (sectionIds: string[]): Promise<boolean> => {
    try {
      for (let i = 0; i < sectionIds.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("portfolio_sections")
          .update({ order_index: i })
          .eq("id", sectionIds[i]);
      }
      await fetchPortfolio();
      return true;
    } catch (err) {
      return false;
    }
  };

  // Artifact operations
  const addArtifact = async (
    sectionId: string,
    input: {
      title: string;
      description?: string;
      artifact_type: ArtifactType;
      source_type?: string;
      source_id?: string;
      file_url?: string;
      external_url?: string;
      content?: string;
      thumbnail_url?: string;
      tags?: string[];
      reflection?: string;
    }
  ): Promise<PortfolioArtifact | null> => {
    if (!profile?.tenant_id) return null;

    const section = portfolio?.sections?.find((s) => s.id === sectionId);
    const orderIndex = (section?.artifacts?.length || 0);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolio_artifacts")
        .insert({
          tenant_id: profile.tenant_id,
          section_id: sectionId,
          title: input.title,
          description: input.description || null,
          artifact_type: input.artifact_type,
          source_type: input.source_type || null,
          source_id: input.source_id || null,
          file_url: input.file_url || null,
          external_url: input.external_url || null,
          content: input.content || null,
          thumbnail_url: input.thumbnail_url || null,
          tags: input.tags || [],
          reflection: input.reflection || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPortfolio();
      return data;
    } catch (err) {
      toast.error("Failed to add artifact");
      return null;
    }
  };

  const updateArtifact = async (
    artifactId: string,
    updates: Partial<PortfolioArtifact>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolio_artifacts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", artifactId);

      if (error) throw error;
      await fetchPortfolio();
      return true;
    } catch (err) {
      toast.error("Failed to update artifact");
      return false;
    }
  };

  const deleteArtifact = async (artifactId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolio_artifacts")
        .delete()
        .eq("id", artifactId);

      if (error) throw error;
      await fetchPortfolio();
      return true;
    } catch (err) {
      toast.error("Failed to delete artifact");
      return false;
    }
  };

  const toggleFeatured = async (artifactId: string): Promise<boolean> => {
    const artifact = portfolio?.sections
      ?.flatMap((s) => s.artifacts || [])
      .find((a) => a.id === artifactId);

    if (!artifact) return false;
    return updateArtifact(artifactId, { is_featured: !artifact.is_featured });
  };

  // Add artifact from existing work
  const addFromSubmission = async (
    sectionId: string,
    submissionId: string,
    reflection?: string
  ): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // Fetch submission details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submission } = await (supabase as any)
        .from("submissions")
        .select(`
          *,
          assignment:assignments(title)
        `)
        .eq("id", submissionId)
        .single();

      if (!submission) return false;

      await addArtifact(sectionId, {
        title: submission.assignment?.title || "Submission",
        artifact_type: "submission",
        source_type: "assignment",
        source_id: submissionId,
        file_url: submission.file_urls?.[0] || null,
        reflection,
      });

      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    portfolio,
    isLoading,
    refetch: fetchPortfolio,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    addArtifact,
    updateArtifact,
    deleteArtifact,
    toggleFeatured,
    addFromSubmission,
  };
}

// Hook for portfolio sharing
export function usePortfolioSharing(portfolioId: string) {
  const [shares, setShares] = useState<PortfolioShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchShares = useCallback(async () => {
    if (!profile?.tenant_id || !portfolioId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolio_shares")
        .select("*")
        .eq("portfolio_id", portfolioId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (err) {
      console.error("Failed to fetch shares:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, portfolioId, supabase]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const createShareLink = async (expiresInDays?: number): Promise<PortfolioShare | null> => {
    if (!profile?.tenant_id) return null;

    const shareToken = crypto.randomUUID();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolio_shares")
        .insert({
          tenant_id: profile.tenant_id,
          portfolio_id: portfolioId,
          share_type: "link",
          share_token: shareToken,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      setShares((prev) => [data, ...prev]);

      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/portfolio/view/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");

      return data;
    } catch (_err) {
      toast.error("Failed to create share link");
      return null;
    }
  };

  const shareWithEmail = async (email: string, permissions?: "view" | "comment"): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("portfolio_shares")
        .insert({
          tenant_id: profile.tenant_id,
          portfolio_id: portfolioId,
          share_type: "email",
          shared_with_email: email,
          permissions: permissions || "view",
        })
        .select()
        .single();

      if (error) throw error;
      setShares((prev) => [data, ...prev]);

      // In production, send email notification
      toast.success(`Shared with ${email}`);
      return true;
    } catch (_err) {
      toast.error("Failed to share");
      return false;
    }
  };

  const revokeShare = async (shareId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("portfolio_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Share revoked");
      return true;
    } catch (_err) {
      toast.error("Failed to revoke share");
      return false;
    }
  };

  const getShareUrl = (share: PortfolioShare): string => {
    if (share.share_token) {
      return `${window.location.origin}/portfolio/view/${share.share_token}`;
    }
    return `${window.location.origin}/portfolio/${portfolioId}`;
  };

  return {
    shares,
    linkShares: shares.filter((s) => s.share_type === "link"),
    emailShares: shares.filter((s) => s.share_type === "email"),
    isLoading,
    refetch: fetchShares,
    createShareLink,
    shareWithEmail,
    revokeShare,
    getShareUrl,
  };
}

// Hook for viewing public/shared portfolio
export function usePortfolioViewer(shareToken?: string, portfolioId?: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (shareToken) {
          // Fetch by share token
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: share, error: shareError } = await (supabase as any)
            .from("portfolio_shares")
            .select("portfolio_id, expires_at")
            .eq("share_token", shareToken)
            .single();

          if (shareError || !share) {
            setError("Invalid or expired share link");
            return;
          }

          if (share.expires_at && new Date(share.expires_at) < new Date()) {
            setError("This share link has expired");
            return;
          }

          // Increment view count
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("portfolio_shares")
            .update({
              view_count: 1, // Would increment in real implementation
              last_viewed_at: new Date().toISOString(),
            })
            .eq("share_token", shareToken);

          portfolioId = share.portfolio_id;
        }

        if (!portfolioId) {
          setError("Portfolio not found");
          return;
        }

        // Fetch portfolio
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: portfolioError } = await (supabase as any)
          .from("portfolios")
          .select(`
            *,
            owner:users!portfolios_owner_id_fkey(id, full_name),
            sections:portfolio_sections(
              *,
              artifacts:portfolio_artifacts(*)
            )
          `)
          .eq("id", portfolioId)
          .single();

        if (portfolioError) throw portfolioError;

        // Check if viewable
        if (!data.is_published && !data.is_public && !shareToken) {
          setError("This portfolio is not public");
          return;
        }

        // Sort sections and artifacts
        const sortedPortfolio = {
          ...data,
          sections: (data.sections || [])
            .filter((s: PortfolioSection) => s.is_visible)
            .sort((a: PortfolioSection, b: PortfolioSection) => a.order_index - b.order_index)
            .map((section: PortfolioSection) => ({
              ...section,
              artifacts: (section.artifacts || []).sort(
                (a: PortfolioArtifact, b: PortfolioArtifact) => a.order_index - b.order_index
              ),
            })),
        };

        // Increment portfolio view count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("portfolios")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", portfolioId);

        setPortfolio(sortedPortfolio);
      } catch (err) {
        console.error("Failed to fetch portfolio:", err);
        setError("Failed to load portfolio");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, [shareToken, portfolioId, supabase]);

  return {
    portfolio,
    isLoading,
    error,
  };
}

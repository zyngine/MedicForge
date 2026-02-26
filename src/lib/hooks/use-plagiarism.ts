"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { checkPlagiarism, PlagiarismResult } from "@/lib/plagiarism-utils";

// Helper for tables not in generated types
function getDb() {
  return createClient() as any;
}

export interface WebSearchMatch {
  title: string;
  url: string;
  snippet: string;
  matchedQuery: string;
}

export interface PlagiarismCheck {
  id: string;
  tenant_id: string;
  submission_id: string;
  requested_by: string;
  status: "pending" | "processing" | "completed" | "failed";
  similarity_score: number | null;
  matches: any[] | null;
  web_matches?: WebSearchMatch[] | null;
  original_content: string | null;
  word_count: number | null;
  checked_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  submission?: {
    id: string;
    student_id: string;
    assignment_id: string;
    content: any;
    student?: {
      id: string;
      full_name: string;
    };
    assignment?: {
      id: string;
      title: string;
    };
  };
}

export interface PlagiarismSource {
  id: string;
  tenant_id: string;
  source_type: string;
  source_id: string | null;
  title: string;
  content: string;
  content_hash: string;
  word_count: number | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get plagiarism check for a submission
 */
export function usePlagiarismCheck(submissionId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["plagiarism-check", submissionId],
    queryFn: async () => {
      if (!submissionId || !tenant?.id) return null;

      const supabase = getDb();
      const { data, error } = await supabase
        .from("plagiarism_checks")
        .select(`
          *,
          submission:submissions(
            id,
            student_id,
            assignment_id,
            content,
            student:users!submissions_student_id_fkey(id, full_name),
            assignment:assignments(id, title)
          )
        `)
        .eq("submission_id", submissionId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as PlagiarismCheck | null;
    },
    enabled: !!submissionId && !!tenant?.id,
  });
}

/**
 * Get all plagiarism checks for a course/assignment
 */
export function usePlagiarismChecks(options?: {
  assignmentId?: string;
  status?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["plagiarism-checks", options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();
      let query = supabase
        .from("plagiarism_checks")
        .select(`
          *,
          submission:submissions(
            id,
            student_id,
            assignment_id,
            content,
            student:users!submissions_student_id_fkey(id, full_name),
            assignment:assignments(id, title)
          )
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by assignment if needed
      let results = data as PlagiarismCheck[];
      if (options?.assignmentId) {
        results = results.filter(
          (check) => check.submission?.assignment_id === options.assignmentId
        );
      }

      return results;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get plagiarism sources
 */
export function usePlagiarismSources() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["plagiarism-sources"],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();
      const { data, error } = await supabase
        .from("plagiarism_sources")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlagiarismSource[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Run plagiarism check on a submission
 */
export function useRunPlagiarismCheck() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      content,
      checkWeb = false,
    }: {
      submissionId: string;
      content: string;
      checkWeb?: boolean;
    }) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = getDb();

      // Create or update the check record
      const { data: existingCheck } = await supabase
        .from("plagiarism_checks")
        .select("id")
        .eq("submission_id", submissionId)
        .single();

      let checkId: string;

      if (existingCheck) {
        // Update existing check
        const { data, error } = await supabase
          .from("plagiarism_checks")
          .update({
            status: "processing",
            requested_by: user.id,
            similarity_score: null,
            matches: null,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCheck.id)
          .select()
          .single();

        if (error) throw error;
        checkId = data.id;
      } else {
        // Create new check
        const { data, error } = await supabase
          .from("plagiarism_checks")
          .insert({
            tenant_id: tenant.id,
            submission_id: submissionId,
            requested_by: user.id,
            status: "processing",
            original_content: content,
            word_count: content.split(/\s+/).filter((w: string) => w.length > 0).length,
          })
          .select()
          .single();

        if (error) throw error;
        checkId = data.id;
      }

      // Get sources to compare against
      const { data: sources, error: sourcesError } = await supabase
        .from("plagiarism_sources")
        .select("id, title, source_type, content")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

      if (sourcesError) throw sourcesError;

      // Run the plagiarism check against local sources
      let result: PlagiarismResult;
      try {
        const sourcesForCheck = (sources || []).map((s: PlagiarismSource) => ({
          id: s.id,
          title: s.title,
          type: s.source_type,
          content: s.content,
        }));

        result = checkPlagiarism(content, sourcesForCheck);
      } catch (err) {
        // Update with error
        await supabase
          .from("plagiarism_checks")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Check failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkId);

        throw err;
      }

      // Optionally check against the web
      let webMatches: WebSearchMatch[] | null = null;
      if (checkWeb) {
        try {
          const webResponse = await fetch("/api/plagiarism/web-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });

          if (webResponse.ok) {
            const webData = await webResponse.json();
            webMatches = webData.results || [];
          }
        } catch (webErr) {
          // Web search is optional, don't fail the whole check
          console.warn("Web search failed:", webErr);
        }
      }

      // Update with results
      const updateData: Record<string, unknown> = {
        status: "completed",
        similarity_score: result.overallSimilarity,
        matches: result.matches,
        word_count: result.wordCount,
        checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store web matches in the matches array with a special type
      if (webMatches && webMatches.length > 0) {
        updateData.matches = [
          ...(result.matches || []),
          ...webMatches.map((wm) => ({
            ...wm,
            sourceType: "web",
            similarity: 100, // Web matches are exact phrase matches
          })),
        ];
      }

      const { data: updatedCheck, error: updateError } = await supabase
        .from("plagiarism_checks")
        .update(updateData)
        .eq("id", checkId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedCheck as PlagiarismCheck;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plagiarism-check", data.submission_id] });
      queryClient.invalidateQueries({ queryKey: ["plagiarism-checks"] });
    },
  });
}

/**
 * Add a document as a plagiarism source
 */
export function useAddPlagiarismSource() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      sourceType = "document",
    }: {
      title: string;
      content: string;
      sourceType?: string;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = getDb();

      // Generate content hash
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: source, error } = await supabase
        .from("plagiarism_sources")
        .insert({
          tenant_id: tenant.id,
          source_type: sourceType,
          title,
          content,
          content_hash: contentHash,
          word_count: content.split(/\s+/).filter((w: string) => w.length > 0).length,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This content already exists in the database");
        }
        throw error;
      }

      return source as PlagiarismSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plagiarism-sources"] });
    },
  });
}

/**
 * Remove a plagiarism source
 */
export function useRemovePlagiarismSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const supabase = getDb();

      const { error } = await supabase
        .from("plagiarism_sources")
        .update({ is_active: false })
        .eq("id", sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plagiarism-sources"] });
    },
  });
}

/**
 * AI Detection result interface
 */
export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  aiScore: number;
  humanScore: number;
  provider: string;
  details: {
    perplexity?: number;
    burstiness?: number;
    sentenceVariability?: number;
    vocabularyRichness?: number;
    repetitionScore?: number;
    naturalness?: number;
  };
  sentences?: Array<{
    text: string;
    aiProbability: number;
  }>;
  message?: string;
}

/**
 * Run AI detection on content
 */
export function useAIDetection() {
  return useMutation({
    mutationFn: async (content: string): Promise<AIDetectionResult> => {
      const response = await fetch("/api/plagiarism/ai-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI detection failed");
      }

      return response.json();
    },
  });
}

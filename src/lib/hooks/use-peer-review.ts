"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface PeerReviewAssignment {
  id: string;
  tenant_id: string;
  assignment_id: string;
  reviews_per_student: number;
  anonymous_reviews: boolean;
  self_review_allowed: boolean;
  review_rubric_id: string | null;
  review_due_date: string | null;
  review_instructions: string | null;
  min_word_count: number | null;
  assignment_method: "random" | "manual" | "balanced";
  status: "setup" | "distributing" | "reviewing" | "completed";
  created_at: string;
  updated_at: string;
  // Joined
  assignment?: { id: string; title: string; points_possible: number };
  rubric?: { id: string; title: string };
}

export interface PeerReviewPair {
  id: string;
  tenant_id: string;
  peer_review_assignment_id: string;
  reviewer_id: string;
  author_id: string;
  submission_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Joined
  reviewer?: { id: string; full_name: string };
  author?: { id: string; full_name: string };
  submission?: { id: string; content: unknown; file_urls: string[] };
  review?: PeerReview;
}

export interface PeerReview {
  id: string;
  tenant_id: string;
  peer_review_pair_id: string;
  overall_score: number | null;
  overall_feedback: string | null;
  rubric_scores: Record<string, { score: number; feedback: string }> | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  private_notes: string | null;
  is_helpful: boolean | null;
  helpfulness_feedback: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Hook for managing peer review assignments (instructor)
export function usePeerReviewAssignments(assignmentId?: string) {
  const [peerReviewAssignments, setPeerReviewAssignments] = useState<PeerReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchAssignments = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("peer_review_assignments")
        .select(`
          *,
          assignment:assignments(id, title, points_possible),
          rubric:rubrics(id, title)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setPeerReviewAssignments(data || []);
    } catch (err) {
      console.error("Failed to fetch peer review assignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, assignmentId, supabase]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const enablePeerReview = async (input: {
    assignment_id: string;
    reviews_per_student?: number;
    anonymous_reviews?: boolean;
    self_review_allowed?: boolean;
    review_rubric_id?: string;
    review_due_date?: string;
    review_instructions?: string;
    min_word_count?: number;
    assignment_method?: PeerReviewAssignment["assignment_method"];
  }): Promise<PeerReviewAssignment | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("peer_review_assignments")
        .insert({
          tenant_id: profile.tenant_id,
          assignment_id: input.assignment_id,
          reviews_per_student: input.reviews_per_student || 3,
          anonymous_reviews: input.anonymous_reviews ?? true,
          self_review_allowed: input.self_review_allowed ?? false,
          review_rubric_id: input.review_rubric_id || null,
          review_due_date: input.review_due_date || null,
          review_instructions: input.review_instructions || null,
          min_word_count: input.min_word_count || null,
          assignment_method: input.assignment_method || "random",
          status: "setup",
        })
        .select(`
          *,
          assignment:assignments(id, title, points_possible)
        `)
        .single();

      if (error) throw error;
      setPeerReviewAssignments((prev) => [data, ...prev]);
      toast.success("Peer review enabled");
      return data;
    } catch (_err) {
      toast.error("Failed to enable peer review");
      return null;
    }
  };

  const updateSettings = async (
    id: string,
    updates: Partial<PeerReviewAssignment>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_review_assignments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setPeerReviewAssignments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      toast.success("Settings updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update settings");
      return false;
    }
  };

  const distributeReviews = async (id: string): Promise<number> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("distribute_peer_reviews", { p_peer_review_assignment_id: id });

      if (error) throw error;
      await fetchAssignments();
      toast.success(`Distributed ${data} peer reviews`);
      return data;
    } catch (_err) {
      toast.error("Failed to distribute peer reviews");
      return 0;
    }
  };

  const completeReviews = async (id: string): Promise<boolean> => {
    return updateSettings(id, { status: "completed" });
  };

  const disablePeerReview = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_review_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPeerReviewAssignments((prev) => prev.filter((p) => p.id !== id));
      toast.success("Peer review disabled");
      return true;
    } catch (_err) {
      toast.error("Failed to disable peer review");
      return false;
    }
  };

  return {
    peerReviewAssignments,
    isLoading,
    refetch: fetchAssignments,
    enablePeerReview,
    updateSettings,
    distributeReviews,
    completeReviews,
    disablePeerReview,
  };
}

// Hook for student's peer review tasks
export function useMyPeerReviews() {
  const [assignedReviews, setAssignedReviews] = useState<PeerReviewPair[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<PeerReviewPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchReviews = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch reviews I need to do
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assigned, error: assignedError } = await (supabase as any)
        .from("peer_review_pairs")
        .select(`
          *,
          submission:submissions(id, content, file_urls),
          review:peer_reviews(*)
        `)
        .eq("reviewer_id", profile.id)
        .order("assigned_at", { ascending: false });

      if (assignedError) throw assignedError;
      setAssignedReviews(assigned || []);

      // Fetch reviews I received
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: received, error: receivedError } = await (supabase as any)
        .from("peer_review_pairs")
        .select(`
          *,
          review:peer_reviews(*)
        `)
        .eq("author_id", profile.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (receivedError) throw receivedError;
      setReceivedReviews(received || []);
    } catch (err) {
      console.error("Failed to fetch peer reviews:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, supabase]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const startReview = async (pairId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_review_pairs")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", pairId);

      if (error) throw error;
      setAssignedReviews((prev) =>
        prev.map((r) =>
          r.id === pairId
            ? { ...r, status: "in_progress", started_at: new Date().toISOString() }
            : r
        )
      );
      return true;
    } catch (_err) {
      return false;
    }
  };

  const submitReview = async (
    pairId: string,
    review: {
      overall_score?: number;
      overall_feedback: string;
      rubric_scores?: Record<string, { score: number; feedback: string }>;
      strengths?: string;
      areas_for_improvement?: string;
    }
  ): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // Create or update review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: reviewError } = await (supabase as any)
        .from("peer_reviews")
        .upsert({
          tenant_id: profile.tenant_id,
          peer_review_pair_id: pairId,
          overall_score: review.overall_score || null,
          overall_feedback: review.overall_feedback,
          rubric_scores: review.rubric_scores || null,
          strengths: review.strengths || null,
          areas_for_improvement: review.areas_for_improvement || null,
          submitted_at: new Date().toISOString(),
        });

      if (reviewError) throw reviewError;

      // Update pair status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: pairError } = await (supabase as any)
        .from("peer_review_pairs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", pairId);

      if (pairError) throw pairError;

      await fetchReviews();
      toast.success("Review submitted");
      return true;
    } catch (_err) {
      toast.error("Failed to submit review");
      return false;
    }
  };

  const skipReview = async (pairId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_review_pairs")
        .update({ status: "skipped" })
        .eq("id", pairId);

      if (error) throw error;
      setAssignedReviews((prev) =>
        prev.map((r) => (r.id === pairId ? { ...r, status: "skipped" } : r))
      );
      return true;
    } catch (_err) {
      return false;
    }
  };

  const rateReviewHelpfulness = async (
    reviewId: string,
    isHelpful: boolean,
    feedback?: string
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_reviews")
        .update({
          is_helpful: isHelpful,
          helpfulness_feedback: feedback || null,
        })
        .eq("id", reviewId);

      if (error) throw error;
      toast.success("Feedback submitted");
      return true;
    } catch (_err) {
      return false;
    }
  };

  // Stats
  const pendingReviews = assignedReviews.filter((r) => r.status === "pending");
  const inProgressReviews = assignedReviews.filter((r) => r.status === "in_progress");
  const completedReviews = assignedReviews.filter((r) => r.status === "completed");

  return {
    assignedReviews,
    receivedReviews,
    pendingReviews,
    inProgressReviews,
    completedReviews,
    isLoading,
    refetch: fetchReviews,
    startReview,
    submitReview,
    skipReview,
    rateReviewHelpfulness,
  };
}

// Hook for instructor to view all peer reviews for an assignment
export function usePeerReviewOverview(peerReviewAssignmentId: string) {
  const [pairs, setPairs] = useState<PeerReviewPair[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    pending: number;
    averageScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchOverview = async () => {
      if (!profile?.tenant_id || !peerReviewAssignmentId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch all pairs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("peer_review_pairs")
          .select(`
            *,
            reviewer:users!peer_review_pairs_reviewer_id_fkey(id, full_name),
            author:users!peer_review_pairs_author_id_fkey(id, full_name),
            review:peer_reviews(*)
          `)
          .eq("peer_review_assignment_id", peerReviewAssignmentId)
          .order("assigned_at");

        if (error) throw error;
        setPairs(data || []);

        // Calculate stats
        const total = data?.length || 0;
        const completed = data?.filter((p: PeerReviewPair) => p.status === "completed").length || 0;
        const pending = data?.filter((p: PeerReviewPair) => p.status === "pending").length || 0;
        const scores = data
          ?.filter((p: PeerReviewPair & { review: PeerReview[] }) => p.review?.[0]?.overall_score)
          .map((p: PeerReviewPair & { review: PeerReview[] }) => p.review[0].overall_score) || [];
        const averageScore = scores.length > 0
          ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          : 0;

        setStats({ total, completed, pending, averageScore });
      } catch (err) {
        console.error("Failed to fetch peer review overview:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [profile?.tenant_id, peerReviewAssignmentId, supabase]);

  // Group by author to see all reviews for each submission
  const reviewsByAuthor = pairs.reduce((acc, pair) => {
    const authorId = pair.author_id;
    if (!acc[authorId]) {
      acc[authorId] = {
        author: pair.author,
        reviews: [],
      };
    }
    acc[authorId].reviews.push(pair);
    return acc;
  }, {} as Record<string, { author: PeerReviewPair["author"]; reviews: PeerReviewPair[] }>);

  // Group by reviewer to see review workload
  const reviewsByReviewer = pairs.reduce((acc, pair) => {
    const reviewerId = pair.reviewer_id;
    if (!acc[reviewerId]) {
      acc[reviewerId] = {
        reviewer: pair.reviewer,
        reviews: [],
      };
    }
    acc[reviewerId].reviews.push(pair);
    return acc;
  }, {} as Record<string, { reviewer: PeerReviewPair["reviewer"]; reviews: PeerReviewPair[] }>);

  return {
    pairs,
    stats,
    reviewsByAuthor,
    reviewsByReviewer,
    isLoading,
  };
}

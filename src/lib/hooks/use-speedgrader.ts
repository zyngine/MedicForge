"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface SpeedGraderSession {
  id: string;
  tenant_id: string;
  grader_id: string;
  assignment_id: string;
  current_submission_id: string | null;
  submissions_graded: number;
  submissions_total: number;
  started_at: string;
  last_activity: string;
  filters: {
    status?: string[];
    section?: string;
    search?: string;
  };
  sort_order: string;
  created_at: string;
}

export interface GradingComment {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  comment_text: string;
  category: string | null;
  points_adjustment: number | null;
  usage_count: number;
  is_shared: boolean;
  shortcut: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionAnnotation {
  id: string;
  tenant_id: string;
  submission_id: string;
  grader_id: string;
  annotation_type: "highlight" | "comment" | "strikethrough" | "drawing";
  page_number: number | null;
  position_data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    path?: string;
  };
  content: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SpeedGraderSubmission {
  id: string;
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  attempt_number: number;
  content: unknown;
  file_urls: string[];
  started_at: string | null;
  submitted_at: string | null;
  status: string;
  raw_score: number | null;
  curved_score: number | null;
  final_score: number | null;
  graded_by: string | null;
  graded_at: string | null;
  feedback: unknown | null;
  // Joined
  student?: { id: string; full_name: string; email: string };
  annotations?: SubmissionAnnotation[];
}

// Hook for SpeedGrader session
export function useSpeedGrader(assignmentId: string) {
  const [session, setSession] = useState<SpeedGraderSession | null>(null);
  const [submissions, setSubmissions] = useState<SpeedGraderSubmission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSubmissions = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id || !assignmentId) return;

    try {
      setIsLoading(true);

      // Get or create session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: sessionData } = await (supabase as any)
        .from("speedgrader_sessions")
        .select("*")
        .eq("grader_id", profile.id)
        .eq("assignment_id", assignmentId)
        .single();

      // Fetch submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissionsData, error } = await (supabase as any)
        .from("submissions")
        .select(`
          *,
          student:users!submissions_student_id_fkey(id, full_name, email)
        `)
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: true });

      if (error) throw error;

      // Create session if doesn't exist
      if (!sessionData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newSession } = await (supabase as any)
          .from("speedgrader_sessions")
          .insert({
            tenant_id: profile.tenant_id,
            grader_id: profile.id,
            assignment_id: assignmentId,
            submissions_total: submissionsData?.length || 0,
            filters: {},
            sort_order: "name_asc",
          })
          .select()
          .single();

        sessionData = newSession;
      }

      setSession(sessionData);
      setSubmissions(submissionsData || []);

      // Set current index based on session
      if (sessionData?.current_submission_id) {
        const idx = (submissionsData || []).findIndex(
          (s: SpeedGraderSubmission) => s.id === sessionData.current_submission_id
        );
        if (idx >= 0) setCurrentIndex(idx);
      }
    } catch (err) {
      console.error("Failed to fetch speedgrader data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, assignmentId, supabase]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const navigateToSubmission = async (index: number): Promise<void> => {
    if (index < 0 || index >= submissions.length) return;

    setCurrentIndex(index);

    // Update session
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("speedgrader_sessions")
        .update({
          current_submission_id: submissions[index].id,
          last_activity: new Date().toISOString(),
        })
        .eq("id", session.id);
    }
  };

  const goToNext = () => navigateToSubmission(currentIndex + 1);
  const goToPrevious = () => navigateToSubmission(currentIndex - 1);

  const gradeSubmission = async (
    submissionId: string,
    score: number,
    feedback?: unknown
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("submissions")
        .update({
          raw_score: score,
          final_score: score,
          feedback: feedback || null,
          graded_by: profile.id,
          graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", submissionId);

      if (error) throw error;

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                raw_score: score,
                final_score: score,
                feedback,
                graded_by: profile.id,
                graded_at: new Date().toISOString(),
                status: "graded",
              }
            : s
        )
      );

      // Update session graded count
      if (session) {
        const gradedCount = submissions.filter((s) => s.status === "graded").length + 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("speedgrader_sessions")
          .update({
            submissions_graded: gradedCount,
            last_activity: new Date().toISOString(),
          })
          .eq("id", session.id);
      }

      toast.success("Grade saved");
      return true;
    } catch (_err) {
      toast.error("Failed to save grade");
      return false;
    }
  };

  const updateFilters = async (filters: SpeedGraderSession["filters"]): Promise<void> => {
    if (!session) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("speedgrader_sessions")
      .update({ filters })
      .eq("id", session.id);

    setSession((prev) => (prev ? { ...prev, filters } : null));
  };

  const updateSortOrder = async (sortOrder: string): Promise<void> => {
    if (!session) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("speedgrader_sessions")
      .update({ sort_order: sortOrder })
      .eq("id", session.id);

    setSession((prev) => (prev ? { ...prev, sort_order: sortOrder } : null));

    // Resort submissions
    const sorted = [...submissions].sort((a, b) => {
      switch (sortOrder) {
        case "name_asc":
          return (a.student?.full_name || "").localeCompare(b.student?.full_name || "");
        case "name_desc":
          return (b.student?.full_name || "").localeCompare(a.student?.full_name || "");
        case "submitted_asc":
          return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
        case "submitted_desc":
          return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();
        case "score_asc":
          return (a.final_score || 0) - (b.final_score || 0);
        case "score_desc":
          return (b.final_score || 0) - (a.final_score || 0);
        default:
          return 0;
      }
    });

    setSubmissions(sorted);
    setCurrentIndex(0);
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (!session?.filters) return true;

    const { status, search } = session.filters;

    if (status?.length && !status.includes(s.status)) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !s.student?.full_name?.toLowerCase().includes(searchLower) &&
        !s.student?.email?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    return true;
  });

  const currentSubmission = filteredSubmissions[currentIndex];
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const needsGradingCount = submissions.filter((s) => s.status === "submitted").length;

  return {
    session,
    submissions: filteredSubmissions,
    currentSubmission,
    currentIndex,
    isLoading,
    gradedCount,
    needsGradingCount,
    totalCount: submissions.length,
    navigateToSubmission,
    goToNext,
    goToPrevious,
    gradeSubmission,
    updateFilters,
    updateSortOrder,
    refetch: fetchSubmissions,
  };
}

// Hook for grading comment library
export function useGradingComments() {
  const [comments, setComments] = useState<GradingComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("grading_comment_library")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .or(`created_by.eq.${profile.id},is_shared.eq.true`)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Failed to fetch grading comments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const createComment = async (input: {
    title: string;
    comment_text: string;
    category?: string;
    points_adjustment?: number;
    is_shared?: boolean;
    shortcut?: string;
  }): Promise<GradingComment | null> => {
    if (!profile?.tenant_id || !profile?.id) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("grading_comment_library")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          title: input.title,
          comment_text: input.comment_text,
          category: input.category || null,
          points_adjustment: input.points_adjustment || null,
          is_shared: input.is_shared ?? false,
          shortcut: input.shortcut || null,
        })
        .select()
        .single();

      if (error) throw error;
      setComments((prev) => [data, ...prev]);
      toast.success("Comment saved to library");
      return data;
    } catch (err) {
      toast.error("Failed to save comment");
      return null;
    }
  };

  const useComment = async (commentId: string): Promise<GradingComment | null> => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return null;

    // Increment usage count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("grading_comment_library")
      .update({ usage_count: comment.usage_count + 1 })
      .eq("id", commentId);

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, usage_count: c.usage_count + 1 } : c))
    );

    return comment;
  };

  const deleteComment = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("grading_comment_library")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete comment");
      return false;
    }
  };

  const findByShortcut = (shortcut: string): GradingComment | undefined => {
    return comments.find((c) => c.shortcut === shortcut);
  };

  // Group by category
  const commentsByCategory = comments.reduce((acc, comment) => {
    const category = comment.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(comment);
    return acc;
  }, {} as Record<string, GradingComment[]>);

  return {
    comments,
    commentsByCategory,
    isLoading,
    createComment,
    useComment,
    deleteComment,
    findByShortcut,
  };
}

// Hook for submission annotations
export function useSubmissionAnnotations(submissionId: string) {
  const [annotations, setAnnotations] = useState<SubmissionAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchAnnotations = useCallback(async () => {
    if (!profile?.tenant_id || !submissionId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("submission_annotations")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at");

      if (error) throw error;
      setAnnotations(data || []);
    } catch (err) {
      console.error("Failed to fetch annotations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, submissionId, supabase]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const addAnnotation = async (input: {
    annotation_type: SubmissionAnnotation["annotation_type"];
    page_number?: number;
    position_data: SubmissionAnnotation["position_data"];
    content?: string;
    color?: string;
  }): Promise<SubmissionAnnotation | null> => {
    if (!profile?.tenant_id || !profile?.id) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("submission_annotations")
        .insert({
          tenant_id: profile.tenant_id,
          submission_id: submissionId,
          grader_id: profile.id,
          annotation_type: input.annotation_type,
          page_number: input.page_number || null,
          position_data: input.position_data,
          content: input.content || null,
          color: input.color || "#FFFF00",
        })
        .select()
        .single();

      if (error) throw error;
      setAnnotations((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("Failed to add annotation:", err);
      return null;
    }
  };

  const updateAnnotation = async (
    id: string,
    updates: Partial<SubmissionAnnotation>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("submission_annotations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      return true;
    } catch (_err) {
      return false;
    }
  };

  const deleteAnnotation = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("submission_annotations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (_err) {
      return false;
    }
  };

  const clearAllAnnotations = async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("submission_annotations")
        .delete()
        .eq("submission_id", submissionId);

      if (error) throw error;
      setAnnotations([]);
      return true;
    } catch (_err) {
      return false;
    }
  };

  // Group by page
  const annotationsByPage = annotations.reduce((acc, annotation) => {
    const page = annotation.page_number || 1;
    if (!acc[page]) acc[page] = [];
    acc[page].push(annotation);
    return acc;
  }, {} as Record<number, SubmissionAnnotation[]>);

  return {
    annotations,
    annotationsByPage,
    isLoading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
  };
}

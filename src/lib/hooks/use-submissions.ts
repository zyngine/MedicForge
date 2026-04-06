"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import type { Database } from "@/types/database.types";

type Submission = Database["public"]["Tables"]["submissions"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];

export interface SubmissionWithDetails extends Submission {
  assignment?: Assignment & {
    module?: {
      id: string;
      title: string;
      course_id: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quiz_questions?: any[];
  };
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
  grader?: {
    id: string;
    full_name: string;
    email: string;
  };
}

type SubmissionStatus = "in_progress" | "submitted" | "graded" | "returned";

interface UseSubmissionsOptions {
  assignmentId?: string;
  studentId?: string;
  status?: SubmissionStatus | SubmissionStatus[];
}

/**
 * Get submissions with optional filters
 */
export function useSubmissions(options: UseSubmissionsOptions = {}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["submissions", tenant?.id, options],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("submissions")
        .select(`
          *,
          assignment:assignments(
            *,
            module:modules(id, title, course_id)
          ),
          student:users!submissions_student_id_fkey(id, full_name, email),
          grader:users!submissions_graded_by_fkey(id, full_name, email)
        `)
        .eq("tenant_id", tenant!.id)
        .order("submitted_at", { ascending: false });

      if (options.assignmentId) {
        query = query.eq("assignment_id", options.assignmentId);
      }

      if (options.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in("status", options.status);
        } else {
          query = query.eq("status", options.status);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((sub: any) => ({
        ...sub,
        status: sub.status ?? "in_progress",
        assignment: sub.assignment ? {
          ...sub.assignment,
          type: sub.assignment.type ?? "quiz",
        } : undefined,
        student: sub.student || undefined,
        grader: sub.grader || undefined,
      })) as SubmissionWithDetails[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single submission with full details
 */
export function useSubmission(submissionId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["submission", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          assignment:assignments(
            *,
            module:modules(id, title, course_id),
            quiz_questions:quiz_questions(*)
          ),
          student:users!submissions_student_id_fkey(id, full_name, email),
          grader:users!submissions_graded_by_fkey(id, full_name, email)
        `)
        .eq("id", submissionId)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status ?? "in_progress",
        assignment: data.assignment ? {
          ...data.assignment,
          type: data.assignment.type ?? "quiz",
        } : undefined,
        student: data.student || undefined,
        grader: data.grader || undefined,
      } as SubmissionWithDetails;
    },
    enabled: !!submissionId && !!tenant?.id,
  });
}

/**
 * Start a new submission (student)
 */
export function useStartSubmission() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Check existing attempts
      const { data: existingSubmissions } = await supabase
        .from("submissions")
        .select("attempt_number")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false });

      const maxAttempt = existingSubmissions?.[0]?.attempt_number || 0;

      const { data, error } = await supabase
        .from("submissions")
        .insert({
          tenant_id: tenant.id,
          assignment_id: assignmentId,
          student_id: user.id,
          attempt_number: maxAttempt + 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

/**
 * Submit a submission (student)
 */
export function useSubmitSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      content,
      fileUrls,
    }: {
      submissionId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: any;
      fileUrls?: string[];
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("submissions")
        .update({
          content,
          file_urls: fileUrls || null,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["submission", submission.id] });
    },
  });
}

/**
 * Save draft (student) - auto-save in progress
 */
export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      content,
    }: {
      submissionId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: any;
    }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("submissions")
        .update({ content })
        .eq("id", submissionId);

      if (error) throw error;
      return { submissionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["submission", result.submissionId] });
    },
  });
}

/**
 * Grade a submission (instructor)
 */
export function useGradeSubmission() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      rawScore,
      curvedScore,
      finalScore,
      feedback,
    }: {
      submissionId: string;
      rawScore: number;
      curvedScore?: number;
      finalScore: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feedback?: any;
    }) => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("submissions")
        .update({
          raw_score: rawScore,
          curved_score: curvedScore || null,
          final_score: finalScore,
          feedback: feedback || null,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["submission", submission.id] });
    },
  });
}

/**
 * Return submission for revisions (instructor)
 */
export function useReturnSubmission() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      feedback,
    }: {
      submissionId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feedback: any;
    }) => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("submissions")
        .update({
          feedback,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          status: "returned",
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["submission", submission.id] });
    },
  });
}

type CurveMethod = "none" | "bell" | "sqrt" | "linear" | "flat";

interface ApplyGradeCurveParams {
  assignmentId?: string; // If provided, only curve this assignment's submissions
  curveMethod: CurveMethod;
  targetMean?: number; // For bell curve (0-100)
  bonusPoints?: number; // For flat curve
  maxPoints: number;
}

/**
 * Apply grade curve to multiple submissions
 */
export function useApplyGradeCurve() {
  const { user } = useUser();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ApplyGradeCurveParams) => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Fetch graded submissions to curve
      let query = supabase
        .from("submissions")
        .select("id, raw_score, student_id")
        .eq("status", "graded")
        .not("raw_score", "is", null);

      if (params.assignmentId) {
        query = query.eq("assignment_id", params.assignmentId);
      }

      const { data: submissions, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!submissions || submissions.length === 0) {
        throw new Error("No graded submissions found to curve");
      }

      // Calculate curved scores based on method
      const calculateCurvedScore = (rawScore: number): number => {
        switch (params.curveMethod) {
          case "bell": {
            // Shift scores so mean equals target
            const currentMean = submissions.reduce((sum, s) => sum + (s.raw_score || 0), 0) / submissions.length;
            const targetScore = ((params.targetMean || 80) / 100) * params.maxPoints;
            const adjustment = targetScore - currentMean;
            return Math.min(params.maxPoints, Math.max(0, rawScore + adjustment));
          }
          case "sqrt": {
            // Square root curve
            const normalized = rawScore / params.maxPoints;
            return Math.sqrt(normalized) * params.maxPoints;
          }
          case "linear": {
            // Highest score becomes 100%
            const highest = Math.max(...submissions.map(s => s.raw_score || 0));
            if (highest === 0) return 0;
            const multiplier = params.maxPoints / highest;
            return rawScore * multiplier;
          }
          case "flat": {
            // Add fixed bonus points
            return Math.min(params.maxPoints, rawScore + (params.bonusPoints || 5));
          }
          default:
            return rawScore;
        }
      };

      // Apply curves to all submissions
      const results = [];
      for (const submission of submissions) {
        const rawScore = submission.raw_score || 0;
        const curvedScore = Math.round(calculateCurvedScore(rawScore) * 100) / 100;

        const { data, error } = await supabase
          .from("submissions")
          .update({
            curved_score: curvedScore,
            final_score: curvedScore,
            graded_by: user.id,
            graded_at: new Date().toISOString(),
          })
          .eq("id", submission.id)
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      }

      return results as Submission[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

/**
 * Get submissions for the current user
 */
export function useMySubmissions() {
  const { user } = useUser();

  return useSubmissions({
    studentId: user?.id,
  });
}

/**
 * Get pending submissions (instructor view)
 */
export function usePendingSubmissions() {
  return useSubmissions({
    status: "submitted",
  });
}

/**
 * Get submissions for a specific assignment
 */
export function useAssignmentSubmissions(assignmentId: string | null | undefined) {
  return useSubmissions({
    assignmentId: assignmentId || undefined,
  });
}

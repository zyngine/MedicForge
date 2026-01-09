"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission, Assignment, User } from "@/types";

export interface SubmissionWithDetails extends Submission {
  assignment?: Assignment;
  student?: Pick<User, "id" | "full_name" | "email">;
  grader?: Pick<User, "id" | "full_name" | "email">;
}

type SubmissionStatus = "in_progress" | "submitted" | "graded" | "returned";

interface UseSubmissionsOptions {
  assignmentId?: string;
  studentId?: string;
  status?: SubmissionStatus | SubmissionStatus[];
}

export function useSubmissions(options: UseSubmissionsOptions = {}) {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("submissions")
        .select(`
          *,
          assignment:assignments(*),
          student:users!submissions_student_id_fkey(id, full_name, email),
          grader:users!submissions_graded_by_fkey(id, full_name, email)
        `)
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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data
      const transformedSubmissions: SubmissionWithDetails[] = (data || []).map((sub: any) => ({
        ...sub,
        status: sub.status ?? "in_progress",
        assignment: sub.assignment ? {
          ...sub.assignment,
          type: sub.assignment.type ?? "quiz",
        } : undefined,
        student: sub.student || undefined,
        grader: sub.grader || undefined,
      }));

      setSubmissions(transformedSubmissions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch submissions"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.assignmentId, options.studentId, options.status]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Start a new submission (student)
  const startSubmission = async (assignmentId: string): Promise<Submission | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Check existing attempts
      const { data: existingSubmissions } = await supabase
        .from("submissions")
        .select("attempt_number")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false });

      const maxAttempt = existingSubmissions?.[0]?.attempt_number || 0;

      const { data, error: createError } = await supabase
        .from("submissions")
        .insert([{
          tenant_id: userData.tenant_id,
          assignment_id: assignmentId,
          student_id: user.id,
          attempt_number: maxAttempt + 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchSubmissions();
      return data as Submission;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start submission";
      setError(new Error(message));
      throw err;
    }
  };

  // Submit a submission (student)
  const submitSubmission = async (
    submissionId: string,
    content: any,
    fileUrls?: string[]
  ): Promise<Submission | null> => {
    try {
      const { data, error: updateError } = await supabase
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

      if (updateError) throw updateError;

      await fetchSubmissions();
      return data as Submission;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to submit submission"));
      return null;
    }
  };

  // Save draft (student) - auto-save in progress
  const saveDraft = async (
    submissionId: string,
    content: any
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("submissions")
        .update({ content })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to save draft"));
      return false;
    }
  };

  // Grade a submission (instructor)
  const gradeSubmission = async (
    submissionId: string,
    gradeData: {
      raw_score: number;
      curved_score?: number;
      final_score: number;
      feedback?: any;
    }
  ): Promise<Submission | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: updateError } = await supabase
        .from("submissions")
        .update({
          raw_score: gradeData.raw_score,
          curved_score: gradeData.curved_score || null,
          final_score: gradeData.final_score,
          feedback: gradeData.feedback || null,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchSubmissions();
      return data as Submission;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to grade submission"));
      return null;
    }
  };

  // Return submission for revisions (instructor)
  const returnSubmission = async (
    submissionId: string,
    feedback: any
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          feedback,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          status: "returned",
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      await fetchSubmissions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to return submission"));
      return false;
    }
  };

  // Batch grade (apply curve)
  const applyGradeCurve = async (
    submissionIds: string[],
    curveAdjustment: (rawScore: number) => number
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get all submissions to curve
      const submissionsToGrade = submissions.filter(s =>
        submissionIds.includes(s.id) && s.raw_score !== null
      );

      for (const submission of submissionsToGrade) {
        const curvedScore = curveAdjustment(submission.raw_score!);
        await supabase
          .from("submissions")
          .update({
            curved_score: curvedScore,
            final_score: curvedScore,
            graded_by: user.id,
            graded_at: new Date().toISOString(),
            status: "graded",
          })
          .eq("id", submission.id);
      }

      await fetchSubmissions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to apply grade curve"));
      return false;
    }
  };

  return {
    submissions,
    isLoading,
    error,
    refetch: fetchSubmissions,
    startSubmission,
    submitSubmission,
    saveDraft,
    gradeSubmission,
    returnSubmission,
    applyGradeCurve,
  };
}

// Hook for getting a single submission
export function useSubmission(submissionId: string | null) {
  const [submission, setSubmission] = useState<SubmissionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) {
      setSubmission(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("submissions")
        .select(`
          *,
          assignment:assignments(
            *,
            module:modules(*),
            quiz_questions:quiz_questions(*)
          ),
          student:users!submissions_student_id_fkey(id, full_name, email),
          grader:users!submissions_graded_by_fkey(id, full_name, email)
        `)
        .eq("id", submissionId)
        .single();

      if (fetchError) throw fetchError;

      const transformedSubmission = {
        ...data,
        status: data.status ?? "in_progress",
        assignment: data.assignment ? {
          ...data.assignment,
          type: data.assignment.type ?? "quiz",
        } : undefined,
        student: data.student || undefined,
        grader: data.grader || undefined,
      } as SubmissionWithDetails;

      setSubmission(transformedSubmission);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch submission"));
    } finally {
      setIsLoading(false);
    }
  }, [submissionId, supabase]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  return { submission, isLoading, error, refetch: fetchSubmission };
}

// Hook for getting submissions for the current user
export function useMySubmissions() {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return useSubmissions({ studentId: userId || undefined });
}

// Hook for getting pending submissions (instructor view)
export function usePendingSubmissions() {
  return useSubmissions({ status: "submitted" });
}

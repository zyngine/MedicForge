"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface ModeratedAssignment {
  id: string;
  tenant_id: string;
  assignment_id: string;
  moderator_id: string;
  graders: string[];
  grader_count_required: number;
  anonymize_graders: boolean;
  final_grade_method: "average" | "highest" | "lowest" | "moderator_choice";
  discrepancy_threshold: number;
  status: "setup" | "grading" | "review" | "finalized";
  grades_released: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  assignment?: {
    id: string;
    title: string;
    points_possible: number;
  };
  moderator?: { id: string; full_name: string };
  grader_details?: Array<{ id: string; full_name: string }>;
}

export interface ModeratedGrade {
  id: string;
  tenant_id: string;
  moderated_assignment_id: string;
  submission_id: string;
  grader_id: string;
  score: number | null;
  feedback: string | null;
  rubric_scores: Record<string, number> | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  grader?: { id: string; full_name: string };
}

export interface ModeratedFinalGrade {
  id: string;
  tenant_id: string;
  moderated_assignment_id: string;
  submission_id: string;
  final_score: number | null;
  selected_grader_id: string | null;
  moderator_notes: string | null;
  requires_review: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeDiscrepancy {
  submission_id: string;
  student_name: string;
  grades: Array<{ grader_id: string; grader_name: string; score: number }>;
  max_difference: number;
  requires_review: boolean;
}

// Hook for managing moderated assignments
export function useModeratedAssignments(assignmentId?: string) {
  const [moderatedAssignments, setModeratedAssignments] = useState<ModeratedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchModeratedAssignments = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("moderated_assignments")
        .select(`
          *,
          assignment:assignments(id, title, points_possible),
          moderator:users!moderated_assignments_moderator_id_fkey(id, full_name)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setModeratedAssignments(data || []);
    } catch (err) {
      console.error("Failed to fetch moderated assignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, assignmentId, supabase]);

  useEffect(() => {
    fetchModeratedAssignments();
  }, [fetchModeratedAssignments]);

  const enableModeratedGrading = async (input: {
    assignment_id: string;
    graders: string[];
    grader_count_required?: number;
    anonymize_graders?: boolean;
    final_grade_method?: ModeratedAssignment["final_grade_method"];
    discrepancy_threshold?: number;
  }): Promise<ModeratedAssignment | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("moderated_assignments")
        .insert({
          tenant_id: profile.tenant_id,
          assignment_id: input.assignment_id,
          moderator_id: profile.id,
          graders: input.graders,
          grader_count_required: input.grader_count_required || 2,
          anonymize_graders: input.anonymize_graders ?? true,
          final_grade_method: input.final_grade_method || "average",
          discrepancy_threshold: input.discrepancy_threshold || 10.0,
          status: "setup",
        })
        .select(`
          *,
          assignment:assignments(id, title, points_possible)
        `)
        .single();

      if (error) throw error;
      setModeratedAssignments((prev) => [data, ...prev]);
      toast.success("Moderated grading enabled");
      return data;
    } catch (_err) {
      toast.error("Failed to enable moderated grading");
      return null;
    }
  };

  const updateModeratedAssignment = async (
    id: string,
    updates: Partial<ModeratedAssignment>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("moderated_assignments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setModeratedAssignments((prev) =>
        prev.map((ma) => (ma.id === id ? { ...ma, ...updates } : ma))
      );
      toast.success("Settings updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update settings");
      return false;
    }
  };

  const startGrading = async (id: string): Promise<boolean> => {
    return updateModeratedAssignment(id, { status: "grading" });
  };

  const moveToReview = async (id: string): Promise<boolean> => {
    return updateModeratedAssignment(id, { status: "review" });
  };

  const finalize = async (id: string): Promise<boolean> => {
    return updateModeratedAssignment(id, { status: "finalized" });
  };

  const releaseGrades = async (id: string): Promise<boolean> => {
    return updateModeratedAssignment(id, { grades_released: true });
  };

  const disableModeratedGrading = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("moderated_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setModeratedAssignments((prev) => prev.filter((ma) => ma.id !== id));
      toast.success("Moderated grading disabled");
      return true;
    } catch (_err) {
      toast.error("Failed to disable moderated grading");
      return false;
    }
  };

  return {
    moderatedAssignments,
    isLoading,
    refetch: fetchModeratedAssignments,
    enableModeratedGrading,
    updateModeratedAssignment,
    startGrading,
    moveToReview,
    finalize,
    releaseGrades,
    disableModeratedGrading,
  };
}

// Hook for graders to submit grades
export function useModeratedGrading(moderatedAssignmentId: string) {
  const [submissions, setSubmissions] = useState<Array<{
    submission_id: string;
    student: { id: string; full_name: string };
    my_grade: ModeratedGrade | null;
    all_grades: ModeratedGrade[];
    final_grade: ModeratedFinalGrade | null;
  }>>([]);
  const [moderatedAssignment, setModeratedAssignment] = useState<ModeratedAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id || !moderatedAssignmentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch moderated assignment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: maData, error: maError } = await (supabase as any)
        .from("moderated_assignments")
        .select(`
          *,
          assignment:assignments(id, title, points_possible)
        `)
        .eq("id", moderatedAssignmentId)
        .single();

      if (maError) throw maError;
      setModeratedAssignment(maData);

      // Fetch submissions for this assignment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissionsData, error: subError } = await (supabase as any)
        .from("submissions")
        .select(`
          id,
          student:users!submissions_student_id_fkey(id, full_name)
        `)
        .eq("assignment_id", maData.assignment_id)
        .eq("status", "submitted");

      if (subError) throw subError;

      // Fetch all moderated grades
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gradesData } = await (supabase as any)
        .from("moderated_grades")
        .select(`
          *,
          grader:users!moderated_grades_grader_id_fkey(id, full_name)
        `)
        .eq("moderated_assignment_id", moderatedAssignmentId);

      // Fetch final grades
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: finalGradesData } = await (supabase as any)
        .from("moderated_final_grades")
        .select("*")
        .eq("moderated_assignment_id", moderatedAssignmentId);

      // Combine data
      const combined = (submissionsData || []).map((sub: { id: string; student: { id: string; full_name: string } }) => {
        const allGrades = (gradesData || []).filter(
          (g: ModeratedGrade) => g.submission_id === sub.id
        );
        const myGrade = allGrades.find((g: ModeratedGrade) => g.grader_id === profile.id) || null;
        const finalGrade = (finalGradesData || []).find(
          (fg: ModeratedFinalGrade) => fg.submission_id === sub.id
        ) || null;

        return {
          submission_id: sub.id,
          student: sub.student,
          my_grade: myGrade,
          all_grades: allGrades,
          final_grade: finalGrade,
        };
      });

      setSubmissions(combined);
    } catch (err) {
      console.error("Failed to fetch moderated grading data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, moderatedAssignmentId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitGrade = async (
    submissionId: string,
    score: number,
    feedback?: string,
    rubricScores?: Record<string, number>
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("moderated_grades")
        .upsert({
          tenant_id: profile.tenant_id,
          moderated_assignment_id: moderatedAssignmentId,
          submission_id: submissionId,
          grader_id: profile.id,
          score,
          feedback: feedback || null,
          rubric_scores: rubricScores || null,
          graded_at: new Date().toISOString(),
        });

      if (error) throw error;
      await fetchData();
      toast.success("Grade submitted");
      return true;
    } catch (_err) {
      toast.error("Failed to submit grade");
      return false;
    }
  };

  // Check if current user is a grader
  const isGrader = moderatedAssignment?.graders.includes(profile?.id || "") || false;
  const isModerator = moderatedAssignment?.moderator_id === profile?.id;

  // Get submissions needing my grade
  const needsMyGrade = submissions.filter((s) => !s.my_grade && isGrader);

  // Get my grading progress
  const myGradingProgress = isGrader
    ? {
        total: submissions.length,
        graded: submissions.filter((s) => s.my_grade).length,
        percentage:
          submissions.length > 0
            ? (submissions.filter((s) => s.my_grade).length / submissions.length) * 100
            : 0,
      }
    : null;

  return {
    moderatedAssignment,
    submissions,
    isLoading,
    isGrader,
    isModerator,
    needsMyGrade,
    myGradingProgress,
    refetch: fetchData,
    submitGrade,
  };
}

// Hook for moderator review
export function useModeratorReview(moderatedAssignmentId: string) {
  const [discrepancies, setDiscrepancies] = useState<GradeDiscrepancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchDiscrepancies = useCallback(async () => {
    if (!profile?.tenant_id || !moderatedAssignmentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get moderated assignment for threshold
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: maData } = await (supabase as any)
        .from("moderated_assignments")
        .select("discrepancy_threshold, assignment_id")
        .eq("id", moderatedAssignmentId)
        .single();

      if (!maData) return;

      // Get all submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissionsData } = await (supabase as any)
        .from("submissions")
        .select(`
          id,
          student:users!submissions_student_id_fkey(id, full_name)
        `)
        .eq("assignment_id", maData.assignment_id);

      // Get all grades
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gradesData } = await (supabase as any)
        .from("moderated_grades")
        .select(`
          *,
          grader:users!moderated_grades_grader_id_fkey(id, full_name)
        `)
        .eq("moderated_assignment_id", moderatedAssignmentId)
        .not("score", "is", null);

      // Calculate discrepancies
      const discrepancyList: GradeDiscrepancy[] = [];

      for (const sub of submissionsData || []) {
        const grades = (gradesData || []).filter(
          (g: ModeratedGrade) => g.submission_id === sub.id && g.score !== null
        );

        if (grades.length >= 2) {
          const scores = grades.map((g: ModeratedGrade) => g.score as number);
          const maxDiff = Math.max(...scores) - Math.min(...scores);

          if (maxDiff > maData.discrepancy_threshold) {
            discrepancyList.push({
              submission_id: sub.id,
              student_name: sub.student.full_name,
              grades: grades.map((g: ModeratedGrade & { grader: { id: string; full_name: string } }) => ({
                grader_id: g.grader_id,
                grader_name: g.grader?.full_name || "Unknown",
                score: g.score as number,
              })),
              max_difference: maxDiff,
              requires_review: true,
            });
          }
        }
      }

      setDiscrepancies(discrepancyList);
    } catch (err) {
      console.error("Failed to fetch discrepancies:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, moderatedAssignmentId, supabase]);

  useEffect(() => {
    fetchDiscrepancies();
  }, [fetchDiscrepancies]);

  const setFinalGrade = async (
    submissionId: string,
    finalScore: number,
    selectedGraderId?: string,
    notes?: string
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("moderated_final_grades")
        .upsert({
          tenant_id: profile.tenant_id,
          moderated_assignment_id: moderatedAssignmentId,
          submission_id: submissionId,
          final_score: finalScore,
          selected_grader_id: selectedGraderId || null,
          moderator_notes: notes || null,
          requires_review: false,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Also update the actual submission
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("submissions")
        .update({
          final_score: finalScore,
          graded_by: profile.id,
          graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", submissionId);

      toast.success("Final grade set");
      await fetchDiscrepancies();
      return true;
    } catch (_err) {
      toast.error("Failed to set final grade");
      return false;
    }
  };

  const calculateFinalGrades = async (
    method: ModeratedAssignment["final_grade_method"]
  ): Promise<number> => {
    if (!profile?.tenant_id || !profile?.id) return 0;

    try {
      // Get all grades
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gradesData } = await (supabase as any)
        .from("moderated_grades")
        .select("submission_id, score")
        .eq("moderated_assignment_id", moderatedAssignmentId)
        .not("score", "is", null);

      // Group by submission
      const gradesBySubmission = (gradesData || []).reduce((acc: Record<string, number[]>, g: { submission_id: string; score: number }) => {
        if (!acc[g.submission_id]) acc[g.submission_id] = [];
        acc[g.submission_id].push(g.score);
        return acc;
      }, {});

      let count = 0;

      for (const [submissionId, scores] of Object.entries(gradesBySubmission)) {
        if ((scores as number[]).length < 2) continue;

        let finalScore: number;
        const typedScores = scores as number[];

        switch (method) {
          case "highest":
            finalScore = Math.max(...typedScores);
            break;
          case "lowest":
            finalScore = Math.min(...typedScores);
            break;
          case "average":
          default:
            finalScore = typedScores.reduce((a, b) => a + b, 0) / typedScores.length;
            break;
        }

        await setFinalGrade(submissionId, Math.round(finalScore * 100) / 100);
        count++;
      }

      toast.success(`Calculated final grades for ${count} submissions`);
      return count;
    } catch (_err) {
      toast.error("Failed to calculate final grades");
      return 0;
    }
  };

  return {
    discrepancies,
    isLoading,
    refetch: fetchDiscrepancies,
    setFinalGrade,
    calculateFinalGrades,
    discrepancyCount: discrepancies.length,
  };
}

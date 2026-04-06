"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type OutcomeType = "course" | "program" | "institutional";
export type AlignmentStrength = "introduced" | "reinforced" | "aligned" | "mastery";

export interface LearningOutcome {
  id: string;
  tenant_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  outcome_code: string | null;
  outcome_type: OutcomeType;
  parent_outcome_id: string | null;
  mastery_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed/joined
  children?: LearningOutcome[];
  alignments_count?: number;
  course?: { id: string; title: string };
}

export interface OutcomeAlignment {
  id: string;
  tenant_id: string;
  outcome_id: string;
  alignable_type: "assignment" | "quiz_question" | "rubric_criterion" | "lesson";
  alignable_id: string;
  alignment_strength: AlignmentStrength;
  created_at: string;
  // Joined
  outcome?: LearningOutcome;
}

export interface StudentOutcomeMastery {
  id: string;
  tenant_id: string;
  student_id: string;
  outcome_id: string;
  course_id: string | null;
  mastery_score: number | null;
  attempts_count: number;
  mastery_achieved: boolean;
  mastery_achieved_at: string | null;
  last_assessed: string | null;
  score_history: Array<{ date: string; score: number; source: string }>;
  created_at: string;
  updated_at: string;
  // Joined
  outcome?: LearningOutcome;
  student?: { id: string; full_name: string };
}

// Hook for managing learning outcomes
export function useLearningOutcomes(courseId?: string) {
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchOutcomes = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("learning_outcomes")
        .select(`
          *,
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true);

      if (courseId) {
        query = query.or(`course_id.eq.${courseId},course_id.is.null`);
      }

      const { data, error } = await query.order("outcome_code");
      if (error) throw error;

      // Build hierarchy
      const hierarchicalOutcomes = buildOutcomeHierarchy(data || []);
      setOutcomes(hierarchicalOutcomes);
    } catch (err) {
      console.error("Failed to fetch outcomes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  // Build parent-child hierarchy
  const buildOutcomeHierarchy = (flatOutcomes: LearningOutcome[]): LearningOutcome[] => {
    const outcomeMap = new Map<string, LearningOutcome>();
    const rootOutcomes: LearningOutcome[] = [];

    // First pass: create map
    for (const outcome of flatOutcomes) {
      outcomeMap.set(outcome.id, { ...outcome, children: [] });
    }

    // Second pass: build hierarchy
    for (const outcome of flatOutcomes) {
      const mappedOutcome = outcomeMap.get(outcome.id)!;
      if (outcome.parent_outcome_id) {
        const parent = outcomeMap.get(outcome.parent_outcome_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(mappedOutcome);
        } else {
          rootOutcomes.push(mappedOutcome);
        }
      } else {
        rootOutcomes.push(mappedOutcome);
      }
    }

    return rootOutcomes;
  };

  const createOutcome = async (input: {
    course_id?: string;
    title: string;
    description?: string;
    outcome_code?: string;
    outcome_type?: OutcomeType;
    parent_outcome_id?: string;
    mastery_threshold?: number;
  }): Promise<LearningOutcome | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("learning_outcomes")
        .insert({
          tenant_id: profile.tenant_id,
          course_id: input.course_id || null,
          title: input.title,
          description: input.description || null,
          outcome_code: input.outcome_code || null,
          outcome_type: input.outcome_type || "course",
          parent_outcome_id: input.parent_outcome_id || null,
          mastery_threshold: input.mastery_threshold || 70.0,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchOutcomes();
      toast.success("Outcome created");
      return data;
    } catch (_err) {
      toast.error("Failed to create outcome");
      return null;
    }
  };

  const updateOutcome = async (id: string, updates: Partial<LearningOutcome>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("learning_outcomes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      await fetchOutcomes();
      toast.success("Outcome updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update outcome");
      return false;
    }
  };

  const deleteOutcome = async (id: string): Promise<boolean> => {
    try {
      // Soft delete by deactivating
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("learning_outcomes")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      await fetchOutcomes();
      toast.success("Outcome deleted");
      return true;
    } catch (_err) {
      toast.error("Failed to delete outcome");
      return false;
    }
  };

  // Filter helpers
  const courseOutcomes = outcomes.filter((o) => o.outcome_type === "course");
  const programOutcomes = outcomes.filter((o) => o.outcome_type === "program");
  const institutionalOutcomes = outcomes.filter((o) => o.outcome_type === "institutional");

  // Flatten for search/select
  const flattenOutcomes = (items: LearningOutcome[], depth = 0): Array<LearningOutcome & { depth: number }> => {
    const result: Array<LearningOutcome & { depth: number }> = [];
    for (const item of items) {
      result.push({ ...item, depth });
      if (item.children?.length) {
        result.push(...flattenOutcomes(item.children, depth + 1));
      }
    }
    return result;
  };

  return {
    outcomes,
    courseOutcomes,
    programOutcomes,
    institutionalOutcomes,
    flatOutcomes: flattenOutcomes(outcomes),
    isLoading,
    refetch: fetchOutcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome,
  };
}

// Hook for managing outcome alignments
export function useOutcomeAlignments(alignableType: string, alignableId: string) {
  const [alignments, setAlignments] = useState<OutcomeAlignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchAlignments = useCallback(async () => {
    if (!profile?.tenant_id || !alignableType || !alignableId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("outcome_alignments")
        .select(`
          *,
          outcome:learning_outcomes(*)
        `)
        .eq("alignable_type", alignableType)
        .eq("alignable_id", alignableId);

      if (error) throw error;
      setAlignments(data || []);
    } catch (err) {
      console.error("Failed to fetch alignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, alignableType, alignableId, supabase]);

  useEffect(() => {
    fetchAlignments();
  }, [fetchAlignments]);

  const addAlignment = async (
    outcomeId: string,
    strength?: AlignmentStrength
  ): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("outcome_alignments")
        .insert({
          tenant_id: profile.tenant_id,
          outcome_id: outcomeId,
          alignable_type: alignableType,
          alignable_id: alignableId,
          alignment_strength: strength || "aligned",
        });

      if (error) throw error;
      await fetchAlignments();
      toast.success("Outcome aligned");
      return true;
    } catch (_err) {
      toast.error("Failed to align outcome");
      return false;
    }
  };

  const updateAlignmentStrength = async (
    alignmentId: string,
    strength: AlignmentStrength
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("outcome_alignments")
        .update({ alignment_strength: strength })
        .eq("id", alignmentId);

      if (error) throw error;
      setAlignments((prev) =>
        prev.map((a) => (a.id === alignmentId ? { ...a, alignment_strength: strength } : a))
      );
      return true;
    } catch (_err) {
      return false;
    }
  };

  const removeAlignment = async (alignmentId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("outcome_alignments")
        .delete()
        .eq("id", alignmentId);

      if (error) throw error;
      setAlignments((prev) => prev.filter((a) => a.id !== alignmentId));
      toast.success("Alignment removed");
      return true;
    } catch (_err) {
      toast.error("Failed to remove alignment");
      return false;
    }
  };

  return {
    alignments,
    isLoading,
    refetch: fetchAlignments,
    addAlignment,
    updateAlignmentStrength,
    removeAlignment,
  };
}

// Hook for student outcome mastery
export function useStudentMastery(studentId?: string, courseId?: string) {
  const [mastery, setMastery] = useState<StudentOutcomeMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchMastery = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    const targetStudentId = studentId || profile.id;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("student_outcome_mastery")
        .select(`
          *,
          outcome:learning_outcomes(*),
          student:users(id, full_name)
        `)
        .eq("student_id", targetStudentId);

      if (courseId) {
        query = query.or(`course_id.eq.${courseId},course_id.is.null`);
      }

      const { data, error } = await query.order("last_assessed", { ascending: false });
      if (error) throw error;
      setMastery(data || []);
    } catch (err) {
      console.error("Failed to fetch mastery:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, studentId, courseId, supabase]);

  useEffect(() => {
    fetchMastery();
  }, [fetchMastery]);

  // Calculate mastery for an outcome using database function
  const calculateMastery = async (outcomeId: string): Promise<number | null> => {
    if (!profile?.id) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("calculate_outcome_mastery", {
          p_student_id: studentId || profile.id,
          p_outcome_id: outcomeId,
          p_course_id: courseId || null,
        });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to calculate mastery:", err);
      return null;
    }
  };

  // Recalculate all mastery scores
  const recalculateAllMastery = async (): Promise<void> => {
    if (!profile?.tenant_id) return;

    try {
      // Get all outcomes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: outcomes } = await (supabase as any)
        .from("learning_outcomes")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true);

      for (const outcome of outcomes || []) {
        const score = await calculateMastery(outcome.id);
        if (score !== null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("student_outcome_mastery")
            .upsert({
              tenant_id: profile.tenant_id,
              student_id: studentId || profile.id,
              outcome_id: outcome.id,
              course_id: courseId || null,
              mastery_score: score,
              last_assessed: new Date().toISOString(),
              mastery_achieved: score >= 70, // Default threshold
            });
        }
      }

      await fetchMastery();
      toast.success("Mastery scores updated");
    } catch (_err) {
      toast.error("Failed to recalculate mastery");
    }
  };

  // Stats
  const masteredOutcomes = mastery.filter((m) => m.mastery_achieved);
  const inProgressOutcomes = mastery.filter((m) => !m.mastery_achieved && (m.mastery_score ?? 0) > 0);
  const notStartedOutcomes = mastery.filter((m) => !m.mastery_score);

  const overallMasteryRate = mastery.length > 0
    ? (masteredOutcomes.length / mastery.length) * 100
    : 0;

  return {
    mastery,
    masteredOutcomes,
    inProgressOutcomes,
    notStartedOutcomes,
    overallMasteryRate,
    isLoading,
    refetch: fetchMastery,
    calculateMastery,
    recalculateAllMastery,
  };
}

// Hook for course outcome report (instructor view)
export function useCourseOutcomeReport(courseId: string) {
  const [report, setReport] = useState<{
    outcomes: Array<{
      outcome: LearningOutcome;
      studentCount: number;
      masteredCount: number;
      averageScore: number;
      alignedAssessments: number;
    }>;
    students: Array<{
      student: { id: string; full_name: string };
      masteryByOutcome: Record<string, number>;
      overallMastery: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchReport = async () => {
      if (!profile?.tenant_id || !courseId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get outcomes for this course
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: outcomes } = await (supabase as any)
          .from("learning_outcomes")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .or(`course_id.eq.${courseId},course_id.is.null`)
          .eq("is_active", true);

        // Get all mastery records
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: masteryData } = await (supabase as any)
          .from("student_outcome_mastery")
          .select(`
            *,
            student:users(id, full_name)
          `)
          .eq("course_id", courseId);

        // Get alignments count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: alignments } = await (supabase as any)
          .from("outcome_alignments")
          .select("outcome_id")
          .in("outcome_id", (outcomes || []).map((o: LearningOutcome) => o.id));

        // Build outcome stats
        const outcomeStats = (outcomes || []).map((outcome: LearningOutcome) => {
          const outcomeMastery = (masteryData || []).filter(
            (m: StudentOutcomeMastery) => m.outcome_id === outcome.id
          );

          return {
            outcome,
            studentCount: outcomeMastery.length,
            masteredCount: outcomeMastery.filter((m: StudentOutcomeMastery) => m.mastery_achieved).length,
            averageScore: outcomeMastery.length > 0
              ? outcomeMastery.reduce((sum: number, m: StudentOutcomeMastery) => sum + (m.mastery_score || 0), 0) / outcomeMastery.length
              : 0,
            alignedAssessments: (alignments || []).filter(
              (a: { outcome_id: string }) => a.outcome_id === outcome.id
            ).length,
          };
        });

        // Build student stats
        const studentMap = new Map<string, {
          student: { id: string; full_name: string };
          masteryByOutcome: Record<string, number>;
        }>();

        for (const m of masteryData || []) {
          if (!studentMap.has(m.student_id)) {
            studentMap.set(m.student_id, {
              student: m.student,
              masteryByOutcome: {},
            });
          }
          studentMap.get(m.student_id)!.masteryByOutcome[m.outcome_id] = m.mastery_score || 0;
        }

        const studentStats = Array.from(studentMap.values()).map((s) => ({
          ...s,
          overallMastery:
            Object.values(s.masteryByOutcome).length > 0
              ? Object.values(s.masteryByOutcome).reduce((a, b) => a + b, 0) /
                Object.values(s.masteryByOutcome).length
              : 0,
        }));

        setReport({
          outcomes: outcomeStats,
          students: studentStats.sort((a, b) => b.overallMastery - a.overallMastery),
        });
      } catch (err) {
        console.error("Failed to fetch outcome report:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [profile?.tenant_id, courseId, supabase]);

  return {
    report,
    isLoading,
  };
}

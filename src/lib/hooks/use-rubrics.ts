"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface Rubric {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description: string | null;
  rubric_type: "analytic" | "holistic" | "single_point";
  is_template: boolean;
  is_shared: boolean;
  total_points: number | null;
  hide_score_from_students: boolean;
  free_form_comments_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  criteria?: RubricCriterion[];
  creator?: { id: string; full_name: string };
}

export interface RubricCriterion {
  id: string;
  tenant_id: string;
  rubric_id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  points: number;
  order_index: number;
  created_at: string;
  // Joined
  ratings?: RubricRating[];
}

export interface RubricRating {
  id: string;
  tenant_id: string;
  criterion_id: string;
  title: string;
  description: string;
  points: number;
  order_index: number;
  created_at: string;
}

export interface RubricAssessment {
  id: string;
  tenant_id: string;
  rubric_id: string;
  submission_id: string;
  assessor_id: string;
  total_score: number | null;
  overall_comments: string | null;
  is_draft: boolean;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  scores?: RubricAssessmentScore[];
  rubric?: Rubric;
}

export interface RubricAssessmentScore {
  id: string;
  tenant_id: string;
  assessment_id: string;
  criterion_id: string;
  rating_id: string | null;
  custom_points: number | null;
  comments: string | null;
  created_at: string;
}

// Hook for managing rubrics
export function useRubrics(options?: { templateOnly?: boolean }) {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchRubrics = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("rubrics")
        .select(`
          *,
          creator:users!rubrics_created_by_fkey(id, full_name),
          criteria:rubric_criteria(
            *,
            ratings:rubric_ratings(*)
          )
        `)
        .eq("tenant_id", profile.tenant_id);

      if (options?.templateOnly) {
        query = query.eq("is_template", true);
      }

      // Show shared, templates, or own rubrics
      query = query.or(`is_shared.eq.true,is_template.eq.true,created_by.eq.${profile.id}`);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Sort criteria and ratings by order_index
      const sortedData = (data || []).map((rubric: Rubric) => ({
        ...rubric,
        criteria: (rubric.criteria || [])
          .sort((a: RubricCriterion, b: RubricCriterion) => a.order_index - b.order_index)
          .map((criterion: RubricCriterion) => ({
            ...criterion,
            ratings: (criterion.ratings || []).sort(
              (a: RubricRating, b: RubricRating) => b.points - a.points // High to low
            ),
          })),
      }));

      setRubrics(sortedData);
    } catch (err) {
      console.error("Failed to fetch rubrics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, options?.templateOnly, supabase]);

  useEffect(() => {
    fetchRubrics();
  }, [fetchRubrics]);

  const createRubric = async (input: {
    title: string;
    description?: string;
    rubric_type?: Rubric["rubric_type"];
    is_template?: boolean;
    is_shared?: boolean;
    hide_score_from_students?: boolean;
    free_form_comments_enabled?: boolean;
  }): Promise<Rubric | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("rubrics")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          title: input.title,
          description: input.description || null,
          rubric_type: input.rubric_type || "analytic",
          is_template: input.is_template ?? false,
          is_shared: input.is_shared ?? false,
          hide_score_from_students: input.hide_score_from_students ?? false,
          free_form_comments_enabled: input.free_form_comments_enabled ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      setRubrics((prev) => [{ ...data, criteria: [] }, ...prev]);
      toast.success("Rubric created");
      return data;
    } catch (err) {
      toast.error("Failed to create rubric");
      return null;
    }
  };

  const updateRubric = async (id: string, updates: Partial<Rubric>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubrics")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setRubrics((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
      toast.success("Rubric updated");
      return true;
    } catch (err) {
      toast.error("Failed to update rubric");
      return false;
    }
  };

  const deleteRubric = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubrics")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRubrics((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rubric deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete rubric");
      return false;
    }
  };

  const duplicateRubric = async (rubricId: string, newTitle: string): Promise<Rubric | null> => {
    const original = rubrics.find((r) => r.id === rubricId);
    if (!original || !profile?.tenant_id || !profile?.id) return null;

    try {
      // Create new rubric
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newRubric, error: rubricError } = await (supabase as any)
        .from("rubrics")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          title: newTitle,
          description: original.description,
          rubric_type: original.rubric_type,
          is_template: false,
          is_shared: false,
          hide_score_from_students: original.hide_score_from_students,
          free_form_comments_enabled: original.free_form_comments_enabled,
        })
        .select()
        .single();

      if (rubricError) throw rubricError;

      // Copy criteria
      for (const criterion of original.criteria || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newCriterion, error: criterionError } = await (supabase as any)
          .from("rubric_criteria")
          .insert({
            tenant_id: profile.tenant_id,
            rubric_id: newRubric.id,
            title: criterion.title,
            description: criterion.description,
            long_description: criterion.long_description,
            points: criterion.points,
            order_index: criterion.order_index,
          })
          .select()
          .single();

        if (criterionError) throw criterionError;

        // Copy ratings
        for (const rating of criterion.ratings || []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("rubric_ratings")
            .insert({
              tenant_id: profile.tenant_id,
              criterion_id: newCriterion.id,
              title: rating.title,
              description: rating.description,
              points: rating.points,
              order_index: rating.order_index,
            });
        }
      }

      await fetchRubrics();
      toast.success("Rubric duplicated");
      return newRubric;
    } catch (err) {
      toast.error("Failed to duplicate rubric");
      return null;
    }
  };

  return {
    rubrics,
    templates: rubrics.filter((r) => r.is_template),
    myRubrics: rubrics.filter((r) => r.created_by === profile?.id),
    isLoading,
    refetch: fetchRubrics,
    createRubric,
    updateRubric,
    deleteRubric,
    duplicateRubric,
  };
}

// Hook for managing rubric criteria and ratings
export function useRubricBuilder(rubricId: string) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchRubric = useCallback(async () => {
    if (!profile?.tenant_id || !rubricId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("rubrics")
        .select(`
          *,
          criteria:rubric_criteria(
            *,
            ratings:rubric_ratings(*)
          )
        `)
        .eq("id", rubricId)
        .single();

      if (error) throw error;

      // Sort criteria and ratings
      const sortedRubric = {
        ...data,
        criteria: (data.criteria || [])
          .sort((a: RubricCriterion, b: RubricCriterion) => a.order_index - b.order_index)
          .map((criterion: RubricCriterion) => ({
            ...criterion,
            ratings: (criterion.ratings || []).sort(
              (a: RubricRating, b: RubricRating) => b.points - a.points
            ),
          })),
      };

      setRubric(sortedRubric);
    } catch (err) {
      console.error("Failed to fetch rubric:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, rubricId, supabase]);

  useEffect(() => {
    fetchRubric();
  }, [fetchRubric]);

  // Criterion operations
  const addCriterion = async (input: {
    title: string;
    description?: string;
    points: number;
  }): Promise<RubricCriterion | null> => {
    if (!profile?.tenant_id || !rubric) return null;

    const orderIndex = (rubric.criteria?.length || 0);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("rubric_criteria")
        .insert({
          tenant_id: profile.tenant_id,
          rubric_id: rubricId,
          title: input.title,
          description: input.description || null,
          points: input.points,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      // Update total points
      const newTotal = (rubric.total_points || 0) + input.points;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("rubrics")
        .update({ total_points: newTotal })
        .eq("id", rubricId);

      await fetchRubric();
      return data;
    } catch (err) {
      toast.error("Failed to add criterion");
      return null;
    }
  };

  const updateCriterion = async (
    criterionId: string,
    updates: Partial<RubricCriterion>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubric_criteria")
        .update(updates)
        .eq("id", criterionId);

      if (error) throw error;
      await fetchRubric();
      return true;
    } catch (err) {
      toast.error("Failed to update criterion");
      return false;
    }
  };

  const deleteCriterion = async (criterionId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubric_criteria")
        .delete()
        .eq("id", criterionId);

      if (error) throw error;
      await fetchRubric();
      return true;
    } catch (err) {
      toast.error("Failed to delete criterion");
      return false;
    }
  };

  // Rating operations
  const addRating = async (
    criterionId: string,
    input: {
      title: string;
      description: string;
      points: number;
    }
  ): Promise<RubricRating | null> => {
    if (!profile?.tenant_id) return null;

    const criterion = rubric?.criteria?.find((c) => c.id === criterionId);
    const orderIndex = criterion?.ratings?.length || 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("rubric_ratings")
        .insert({
          tenant_id: profile.tenant_id,
          criterion_id: criterionId,
          title: input.title,
          description: input.description,
          points: input.points,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchRubric();
      return data;
    } catch (err) {
      toast.error("Failed to add rating");
      return null;
    }
  };

  const updateRating = async (
    ratingId: string,
    updates: Partial<RubricRating>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubric_ratings")
        .update(updates)
        .eq("id", ratingId);

      if (error) throw error;
      await fetchRubric();
      return true;
    } catch (err) {
      toast.error("Failed to update rating");
      return false;
    }
  };

  const deleteRating = async (ratingId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("rubric_ratings")
        .delete()
        .eq("id", ratingId);

      if (error) throw error;
      await fetchRubric();
      return true;
    } catch (err) {
      toast.error("Failed to delete rating");
      return false;
    }
  };

  // Reorder criteria
  const reorderCriteria = async (criteriaIds: string[]): Promise<boolean> => {
    try {
      for (let i = 0; i < criteriaIds.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("rubric_criteria")
          .update({ order_index: i })
          .eq("id", criteriaIds[i]);
      }
      await fetchRubric();
      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    rubric,
    isLoading,
    refetch: fetchRubric,
    addCriterion,
    updateCriterion,
    deleteCriterion,
    addRating,
    updateRating,
    deleteRating,
    reorderCriteria,
  };
}

// Hook for grading with rubric
export function useRubricAssessment(rubricId: string, submissionId: string) {
  const [assessment, setAssessment] = useState<RubricAssessment | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id || !profile?.id || !rubricId || !submissionId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch rubric with criteria and ratings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rubricData, error: rubricError } = await (supabase as any)
          .from("rubrics")
          .select(`
            *,
            criteria:rubric_criteria(
              *,
              ratings:rubric_ratings(*)
            )
          `)
          .eq("id", rubricId)
          .single();

        if (rubricError) throw rubricError;

        // Sort criteria and ratings
        const sortedRubric = {
          ...rubricData,
          criteria: (rubricData.criteria || [])
            .sort((a: RubricCriterion, b: RubricCriterion) => a.order_index - b.order_index)
            .map((criterion: RubricCriterion) => ({
              ...criterion,
              ratings: (criterion.ratings || []).sort(
                (a: RubricRating, b: RubricRating) => b.points - a.points
              ),
            })),
        };
        setRubric(sortedRubric);

        // Fetch existing assessment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assessmentData } = await (supabase as any)
          .from("rubric_assessments")
          .select(`
            *,
            scores:rubric_assessment_scores(*)
          `)
          .eq("rubric_id", rubricId)
          .eq("submission_id", submissionId)
          .eq("assessor_id", profile.id)
          .single();

        setAssessment(assessmentData || null);
      } catch (err) {
        console.error("Failed to fetch assessment data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.tenant_id, profile?.id, rubricId, submissionId, supabase]);

  const saveAssessment = async (
    scores: Record<string, { rating_id?: string; custom_points?: number; comments?: string }>,
    overallComments?: string,
    isDraft?: boolean
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    setIsSaving(true);

    try {
      // Calculate total score
      let totalScore = 0;
      for (const criterionId of Object.keys(scores)) {
        const scoreData = scores[criterionId];
        if (scoreData.custom_points !== undefined) {
          totalScore += scoreData.custom_points;
        } else if (scoreData.rating_id) {
          const criterion = rubric?.criteria?.find((c) => c.id === criterionId);
          const rating = criterion?.ratings?.find((r) => r.id === scoreData.rating_id);
          if (rating) totalScore += rating.points;
        }
      }

      // Create or update assessment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assessmentData, error: assessmentError } = await (supabase as any)
        .from("rubric_assessments")
        .upsert({
          id: assessment?.id || undefined,
          tenant_id: profile.tenant_id,
          rubric_id: rubricId,
          submission_id: submissionId,
          assessor_id: profile.id,
          total_score: totalScore,
          overall_comments: overallComments || null,
          is_draft: isDraft ?? false,
          assessed_at: isDraft ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Save scores for each criterion
      for (const [criterionId, scoreData] of Object.entries(scores)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("rubric_assessment_scores")
          .upsert({
            tenant_id: profile.tenant_id,
            assessment_id: assessmentData.id,
            criterion_id: criterionId,
            rating_id: scoreData.rating_id || null,
            custom_points: scoreData.custom_points || null,
            comments: scoreData.comments || null,
          });
      }

      // Update submission with score if not draft
      if (!isDraft) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("submissions")
          .update({
            raw_score: totalScore,
            final_score: totalScore,
            graded_by: profile.id,
            graded_at: new Date().toISOString(),
            status: "graded",
          })
          .eq("id", submissionId);
      }

      setAssessment(assessmentData);
      toast.success(isDraft ? "Draft saved" : "Assessment saved");
      return true;
    } catch (err) {
      toast.error("Failed to save assessment");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Get score for a criterion
  const getScoreForCriterion = (criterionId: string): RubricAssessmentScore | null => {
    return assessment?.scores?.find((s) => s.criterion_id === criterionId) || null;
  };

  return {
    rubric,
    assessment,
    isLoading,
    isSaving,
    saveAssessment,
    getScoreForCriterion,
  };
}

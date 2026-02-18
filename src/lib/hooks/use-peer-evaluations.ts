"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type PeerEvalType = "team_exercise" | "clinical_rotation" | "simulation" | "lab_partner" | "general";
export type PeerEvalStatus = "pending" | "in_progress" | "completed" | "expired";

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

export interface PeerEvalTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  eval_type: PeerEvalType;
  criteria: EvaluationCriteria[];
  is_anonymous: boolean;
  include_self_evaluation: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface PeerEvalAssignment {
  id: string;
  tenant_id: string;
  course_id: string;
  template_id: string;
  title: string;
  description: string | null;
  context_type: string | null;
  context_id: string | null;
  due_date: string;
  allow_late: boolean;
  created_by: string;
  created_at: string;
  template?: PeerEvalTemplate;
  course?: { id: string; title: string };
}

export interface PeerEvalPair {
  id: string;
  tenant_id: string;
  assignment_id: string;
  evaluator_id: string;
  evaluatee_id: string;
  status: PeerEvalStatus;
  assigned_at: string;
  completed_at: string | null;
  evaluatee?: { id: string; full_name: string; email: string };
  evaluator?: { id: string; full_name: string; email: string };
  assignment?: PeerEvalAssignment;
}

export interface CriteriaScore {
  score: number;
  comment?: string;
}

export interface PeerEvalResponse {
  id: string;
  tenant_id: string;
  pair_id: string;
  criteria_scores: Record<string, CriteriaScore>;
  overall_score: number;
  strengths: string | null;
  areas_for_improvement: string | null;
  additional_comments: string | null;
  is_self_evaluation: boolean;
  submitted_at: string;
}

export interface PeerEvalResult {
  id: string;
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  evaluations_received: number;
  average_score: number | null;
  criteria_averages: Record<string, { average_score: number; count: number }>;
  strengths_summary: string | null;
  improvements_summary: string | null;
  calculated_at: string;
  student?: { id: string; full_name: string; email: string };
}

// Hook for managing peer evaluation templates
export function usePeerEvalTemplates() {
  const [templates, setTemplates] = useState<PeerEvalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("peer_eval_templates")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: {
    name: string;
    description?: string;
    eval_type: PeerEvalType;
    criteria: EvaluationCriteria[];
    is_anonymous?: boolean;
    include_self_evaluation?: boolean;
  }): Promise<PeerEvalTemplate | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("peer_eval_templates")
        .insert({
          tenant_id: profile.tenant_id,
          ...input,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => [...prev, data]);
      toast.success("Template created");
      return data;
    } catch (err) {
      toast.error("Failed to create template");
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<PeerEvalTemplate>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("peer_eval_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      toast.success("Template updated");
      return true;
    } catch (err) {
      toast.error("Failed to update template");
      return false;
    }
  };

  return {
    templates,
    isLoading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
  };
}

// Hook for managing peer evaluation assignments
export function usePeerEvalAssignments(courseId?: string) {
  const [assignments, setAssignments] = useState<PeerEvalAssignment[]>([]);
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
        .from("peer_eval_assignments")
        .select(`
          *,
          template:peer_eval_templates(*),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("due_date", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = async (input: {
    course_id: string;
    template_id: string;
    title: string;
    description?: string;
    context_type?: string;
    context_id?: string;
    due_date: string;
    allow_late?: boolean;
  }): Promise<PeerEvalAssignment | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("peer_eval_assignments")
        .insert({
          tenant_id: profile.tenant_id,
          ...input,
          created_by: profile.id,
        })
        .select(`
          *,
          template:peer_eval_templates(*),
          course:courses(id, title)
        `)
        .single();

      if (error) throw error;
      setAssignments((prev) => [data, ...prev]);
      toast.success("Peer evaluation created");
      return data;
    } catch (err) {
      toast.error("Failed to create peer evaluation");
      return null;
    }
  };

  const createPairsForTeam = async (
    assignmentId: string,
    studentIds: string[],
    includeSelf: boolean = false
  ): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("create_peer_eval_pairs_for_team", {
        p_assignment_id: assignmentId,
        p_tenant_id: profile.tenant_id,
        p_student_ids: studentIds,
        p_include_self: includeSelf,
      });

      if (error) throw error;
      toast.success("Evaluation pairs created");
      return true;
    } catch (err) {
      toast.error("Failed to create evaluation pairs");
      return false;
    }
  };

  return {
    assignments,
    isLoading,
    refetch: fetchAssignments,
    createAssignment,
    createPairsForTeam,
  };
}

// Hook for student's pending evaluations
export function useMyPendingEvaluations() {
  const [evaluations, setEvaluations] = useState<PeerEvalPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchEvaluations = useCallback(async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("peer_eval_pairs")
        .select(`
          *,
          evaluatee:users!peer_eval_pairs_evaluatee_id_fkey(id, full_name, email),
          assignment:peer_eval_assignments(
            *,
            template:peer_eval_templates(*)
          )
        `)
        .eq("evaluator_id", profile.id)
        .in("status", ["pending", "in_progress"])
        .order("assigned_at", { ascending: true });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error("Failed to fetch pending evaluations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  return {
    evaluations,
    isLoading,
    refetch: fetchEvaluations,
  };
}

// Hook for submitting a peer evaluation
export function usePeerEvalSubmission(pairId: string) {
  const [pair, setPair] = useState<PeerEvalPair | null>(null);
  const [existingResponse, setExistingResponse] = useState<PeerEvalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    if (!pairId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Get pair with assignment and template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pairData, error: pairError } = await (supabase as any)
          .from("peer_eval_pairs")
          .select(`
            *,
            evaluatee:users!peer_eval_pairs_evaluatee_id_fkey(id, full_name, email),
            assignment:peer_eval_assignments(
              *,
              template:peer_eval_templates(*)
            )
          `)
          .eq("id", pairId)
          .single();

        if (pairError) throw pairError;
        setPair(pairData);

        // Check for existing response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: responseData } = await (supabase as any)
          .from("peer_eval_responses")
          .select("*")
          .eq("pair_id", pairId)
          .single();

        setExistingResponse(responseData);
      } catch (err) {
        console.error("Failed to fetch evaluation:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [pairId, supabase]);

  const submitEvaluation = async (input: {
    criteria_scores: Record<string, CriteriaScore>;
    strengths?: string;
    areas_for_improvement?: string;
    additional_comments?: string;
  }): Promise<boolean> => {
    if (!pairId) return false;

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("submit_peer_evaluation", {
        p_pair_id: pairId,
        p_criteria_scores: input.criteria_scores,
        p_strengths: input.strengths || null,
        p_improvements: input.areas_for_improvement || null,
        p_comments: input.additional_comments || null,
      });

      if (error) throw error;
      toast.success("Evaluation submitted");
      return true;
    } catch (err) {
      toast.error("Failed to submit evaluation");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    pair,
    existingResponse,
    isLoading,
    isSubmitting,
    submitEvaluation,
  };
}

// Hook for viewing evaluation results (instructor or student own)
export function usePeerEvalResults(assignmentId?: string, studentId?: string) {
  const [results, setResults] = useState<PeerEvalResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchResults = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("peer_eval_results")
        .select(`
          *,
          student:users!peer_eval_results_student_id_fkey(id, full_name, email)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId);
      }

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query.order("calculated_at", { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, assignmentId, studentId, supabase]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const calculateResults = async (assignmentId: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("calculate_peer_eval_results", {
        p_assignment_id: assignmentId,
        p_tenant_id: profile.tenant_id,
      });

      if (error) throw error;
      toast.success("Results calculated");
      await fetchResults();
      return true;
    } catch (err) {
      toast.error("Failed to calculate results");
      return false;
    }
  };

  return {
    results,
    isLoading,
    refetch: fetchResults,
    calculateResults,
  };
}

// Hook for assignment completion status
export function usePeerEvalProgress(assignmentId: string) {
  const [progress, setProgress] = useState<{
    total_pairs: number;
    completed_pairs: number;
    completion_rate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!assignmentId) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("peer_eval_pairs")
          .select("status")
          .eq("assignment_id", assignmentId);

        if (error) throw error;

        const total = data?.length || 0;
        const completed = data?.filter((p: any) => p.status === "completed").length || 0;

        setProgress({
          total_pairs: total,
          completed_pairs: completed,
          completion_rate: total > 0 ? (completed / total) * 100 : 0,
        });
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [assignmentId, supabase]);

  return { progress, isLoading };
}

// Default EMS criteria for creating templates
export const DEFAULT_EMS_CRITERIA: EvaluationCriteria[] = [
  {
    id: "communication",
    name: "Communication",
    description: "Clear, professional communication with team and patient",
    max_score: 5,
    weight: 1.0,
  },
  {
    id: "teamwork",
    name: "Teamwork",
    description: "Works collaboratively, accepts feedback, supports team members",
    max_score: 5,
    weight: 1.0,
  },
  {
    id: "clinical_skills",
    name: "Clinical Skills",
    description: "Demonstrates competence in patient assessment and interventions",
    max_score: 5,
    weight: 1.0,
  },
  {
    id: "leadership",
    name: "Leadership",
    description: "Takes initiative, delegates appropriately, maintains scene control",
    max_score: 5,
    weight: 1.0,
  },
  {
    id: "professionalism",
    name: "Professionalism",
    description: "Professional demeanor, punctual, prepared, respectful",
    max_score: 5,
    weight: 1.0,
  },
  {
    id: "adaptability",
    name: "Adaptability",
    description: "Adjusts to changing situations, problem-solves effectively",
    max_score: 5,
    weight: 1.0,
  },
];

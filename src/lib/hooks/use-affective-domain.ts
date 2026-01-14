"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type EvaluationContext = "classroom" | "lab" | "clinical" | "field" | "simulation";
export type EvaluationRating = "exceeds" | "meets" | "developing" | "below" | "unacceptable";
export type IncidentSeverity = "minor" | "moderate" | "major" | "critical";

export interface AffectiveBehavior {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  indicators: string[];
  unacceptable_behaviors: string[];
  is_critical: boolean;
}

export interface AffectiveEvaluation {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  evaluator_id: string;
  evaluation_date: string;
  context: EvaluationContext;
  shift_id: string | null;
  ratings: Record<string, EvaluationRating>;
  overall_rating: EvaluationRating | null;
  overall_comments: string | null;
  areas_for_improvement: string[];
  remediation_required: boolean;
  follow_up_date: string | null;
  student_acknowledged: boolean;
  student_acknowledged_at: string | null;
  student_comments: string | null;
  created_at: string;
  evaluator?: { full_name: string };
  student?: { full_name: string };
}

export interface AffectiveIncident {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  reported_by: string;
  incident_date: string;
  incident_time: string | null;
  location: string | null;
  context: EvaluationContext | null;
  behavior_ids: string[];
  severity: IncidentSeverity;
  description: string;
  witnesses: string[];
  evidence_urls: string[];
  immediate_action: string | null;
  follow_up_action: string | null;
  remediation_plan: string | null;
  resolved: boolean;
  resolution_date: string | null;
  resolution_notes: string | null;
  student_notified: boolean;
  student_response: string | null;
  created_at: string;
  reporter?: { full_name: string };
  student?: { full_name: string };
  behaviors?: AffectiveBehavior[];
}

export interface RemediationPlan {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  incident_id: string | null;
  target_behaviors: string[];
  objectives: string[];
  activities: string[];
  timeline: string | null;
  start_date: string;
  target_completion_date: string;
  checkpoints: Array<{
    date: string;
    notes: string;
    evaluator_id: string;
    progress_rating: string;
  }>;
  current_status: string;
  completed_at: string | null;
  outcome: string | null;
  created_at: string;
}

export interface StudentAffectiveScore {
  behavior_code: string;
  behavior_name: string;
  average_rating: number;
  evaluation_count: number;
  incidents_count: number;
  trend: string;
}

// Hook for affective behaviors
export function useAffectiveBehaviors() {
  const [behaviors, setBehaviors] = useState<AffectiveBehavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchBehaviors = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("affective_behaviors")
          .select("*")
          .order("category")
          .order("name");

        if (error) throw error;
        setBehaviors(data || []);
      } catch (err) {
        console.error("Failed to fetch behaviors:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBehaviors();
  }, [supabase]);

  // Group by category
  const behaviorsByCategory = behaviors.reduce((acc, b) => {
    if (!acc[b.category]) {
      acc[b.category] = [];
    }
    acc[b.category].push(b);
    return acc;
  }, {} as Record<string, AffectiveBehavior[]>);

  return { behaviors, behaviorsByCategory, isLoading };
}

// Hook for affective evaluations (instructor view)
export function useAffectiveEvaluations(options?: {
  courseId?: string;
  studentId?: string;
}) {
  const [evaluations, setEvaluations] = useState<AffectiveEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchEvaluations = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("affective_evaluations")
        .select(`
          *,
          evaluator:users!affective_evaluations_evaluator_id_fkey(full_name),
          student:users!affective_evaluations_student_id_fkey(full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("evaluation_date", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error("Failed to fetch evaluations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, options?.courseId, options?.studentId, supabase]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const createEvaluation = async (input: {
    student_id: string;
    course_id: string;
    evaluation_date?: string;
    context: EvaluationContext;
    shift_id?: string;
    ratings: Record<string, EvaluationRating>;
    overall_rating?: EvaluationRating;
    overall_comments?: string;
    areas_for_improvement?: string[];
    remediation_required?: boolean;
    follow_up_date?: string;
  }): Promise<AffectiveEvaluation | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("affective_evaluations")
        .insert({
          tenant_id: profile.tenant_id,
          student_id: input.student_id,
          course_id: input.course_id,
          evaluator_id: profile.id,
          evaluation_date: input.evaluation_date || new Date().toISOString().split("T")[0],
          context: input.context,
          shift_id: input.shift_id || null,
          ratings: input.ratings,
          overall_rating: input.overall_rating || null,
          overall_comments: input.overall_comments || null,
          areas_for_improvement: input.areas_for_improvement || [],
          remediation_required: input.remediation_required || false,
          follow_up_date: input.follow_up_date || null,
        })
        .select(`
          *,
          evaluator:users!affective_evaluations_evaluator_id_fkey(full_name),
          student:users!affective_evaluations_student_id_fkey(full_name)
        `)
        .single();

      if (error) throw error;
      setEvaluations((prev) => [data, ...prev]);
      toast.success("Evaluation saved");
      return data;
    } catch (err) {
      console.error("Failed to create evaluation:", err);
      toast.error("Failed to save evaluation");
      return null;
    }
  };

  return {
    evaluations,
    isLoading,
    refetch: fetchEvaluations,
    createEvaluation,
  };
}

// Hook for student's own evaluations
export function useMyAffectiveEvaluations(courseId?: string) {
  const [evaluations, setEvaluations] = useState<AffectiveEvaluation[]>([]);
  const [scores, setScores] = useState<StudentAffectiveScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      try {
        setIsLoading(true);

        // Fetch evaluations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("affective_evaluations")
          .select(`
            *,
            evaluator:users!affective_evaluations_evaluator_id_fkey(full_name)
          `)
          .eq("student_id", profile.id)
          .order("evaluation_date", { ascending: false });

        if (courseId) {
          query = query.eq("course_id", courseId);
        }

        const { data: evalData, error: evalError } = await query;
        if (evalError) throw evalError;
        setEvaluations(evalData || []);

        // Fetch aggregated scores
        if (courseId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: scoreData, error: scoreError } = await (supabase as any)
            .rpc("get_student_affective_score", {
              p_student_id: profile.id,
              p_course_id: courseId,
            });

          if (scoreError) throw scoreError;
          setScores(scoreData || []);
        }
      } catch (err) {
        console.error("Failed to fetch affective data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.id, courseId, supabase]);

  const acknowledgeEvaluation = async (evaluationId: string, comments?: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("affective_evaluations")
        .update({
          student_acknowledged: true,
          student_acknowledged_at: new Date().toISOString(),
          student_comments: comments || null,
        })
        .eq("id", evaluationId);

      if (error) throw error;

      setEvaluations((prev) =>
        prev.map((e) =>
          e.id === evaluationId
            ? {
                ...e,
                student_acknowledged: true,
                student_acknowledged_at: new Date().toISOString(),
                student_comments: comments || null,
              }
            : e
        )
      );
      toast.success("Evaluation acknowledged");
      return true;
    } catch (err) {
      toast.error("Failed to acknowledge evaluation");
      return false;
    }
  };

  return {
    evaluations,
    scores,
    isLoading,
    acknowledgeEvaluation,
    unacknowledgedCount: evaluations.filter((e) => !e.student_acknowledged).length,
  };
}

// Hook for affective incidents
export function useAffectiveIncidents(options?: {
  courseId?: string;
  studentId?: string;
}) {
  const [incidents, setIncidents] = useState<AffectiveIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchIncidents = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("affective_incidents")
        .select(`
          *,
          reporter:users!affective_incidents_reported_by_fkey(full_name),
          student:users!affective_incidents_student_id_fkey(full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("incident_date", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, options?.courseId, options?.studentId, supabase]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const createIncident = async (input: {
    student_id: string;
    course_id: string;
    incident_date: string;
    incident_time?: string;
    location?: string;
    context?: EvaluationContext;
    behavior_ids: string[];
    severity: IncidentSeverity;
    description: string;
    witnesses?: string[];
    evidence_urls?: string[];
    immediate_action?: string;
  }): Promise<AffectiveIncident | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("affective_incidents")
        .insert({
          tenant_id: profile.tenant_id,
          student_id: input.student_id,
          course_id: input.course_id,
          reported_by: profile.id,
          incident_date: input.incident_date,
          incident_time: input.incident_time || null,
          location: input.location || null,
          context: input.context || null,
          behavior_ids: input.behavior_ids,
          severity: input.severity,
          description: input.description,
          witnesses: input.witnesses || [],
          evidence_urls: input.evidence_urls || [],
          immediate_action: input.immediate_action || null,
        })
        .select(`
          *,
          reporter:users!affective_incidents_reported_by_fkey(full_name),
          student:users!affective_incidents_student_id_fkey(full_name)
        `)
        .single();

      if (error) throw error;
      setIncidents((prev) => [data, ...prev]);
      toast.success("Incident reported");
      return data;
    } catch (err) {
      console.error("Failed to create incident:", err);
      toast.error("Failed to report incident");
      return null;
    }
  };

  const resolveIncident = async (
    id: string,
    resolution_notes: string
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("affective_incidents")
        .update({
          resolved: true,
          resolution_date: new Date().toISOString().split("T")[0],
          resolution_notes,
          resolved_by: profile.id,
        })
        .eq("id", id);

      if (error) throw error;

      setIncidents((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                resolved: true,
                resolution_date: new Date().toISOString().split("T")[0],
                resolution_notes,
              }
            : i
        )
      );
      toast.success("Incident resolved");
      return true;
    } catch (err) {
      toast.error("Failed to resolve incident");
      return false;
    }
  };

  return {
    incidents,
    isLoading,
    refetch: fetchIncidents,
    createIncident,
    resolveIncident,
    unresolvedCount: incidents.filter((i) => !i.resolved).length,
  };
}

// Hook for remediation plans
export function useRemediationPlans(options?: {
  courseId?: string;
  studentId?: string;
}) {
  const [plans, setPlans] = useState<RemediationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPlans = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("affective_remediation_plans")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error("Failed to fetch remediation plans:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, options?.courseId, options?.studentId, supabase]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (input: {
    student_id: string;
    course_id: string;
    incident_id?: string;
    target_behaviors: string[];
    objectives: string[];
    activities: string[];
    timeline?: string;
    start_date: string;
    target_completion_date: string;
  }): Promise<RemediationPlan | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("affective_remediation_plans")
        .insert({
          tenant_id: profile.tenant_id,
          student_id: input.student_id,
          course_id: input.course_id,
          incident_id: input.incident_id || null,
          target_behaviors: input.target_behaviors,
          objectives: input.objectives,
          activities: input.activities,
          timeline: input.timeline || null,
          start_date: input.start_date,
          target_completion_date: input.target_completion_date,
          current_status: "active",
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      setPlans((prev) => [data, ...prev]);
      toast.success("Remediation plan created");
      return data;
    } catch (err) {
      console.error("Failed to create plan:", err);
      toast.error("Failed to create remediation plan");
      return null;
    }
  };

  const addCheckpoint = async (
    planId: string,
    notes: string,
    progressRating: string
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    const plan = plans.find((p) => p.id === planId);
    if (!plan) return false;

    const newCheckpoint = {
      date: new Date().toISOString().split("T")[0],
      notes,
      evaluator_id: profile.id,
      progress_rating: progressRating,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("affective_remediation_plans")
        .update({
          checkpoints: [...(plan.checkpoints || []), newCheckpoint],
        })
        .eq("id", planId);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, checkpoints: [...(p.checkpoints || []), newCheckpoint] }
            : p
        )
      );
      toast.success("Checkpoint added");
      return true;
    } catch (err) {
      toast.error("Failed to add checkpoint");
      return false;
    }
  };

  const completePlan = async (
    planId: string,
    outcome: "successful" | "unsuccessful" | "extended"
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("affective_remediation_plans")
        .update({
          current_status: "completed",
          completed_at: new Date().toISOString(),
          outcome,
        })
        .eq("id", planId);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                current_status: "completed",
                completed_at: new Date().toISOString(),
                outcome,
              }
            : p
        )
      );
      toast.success("Plan completed");
      return true;
    } catch (err) {
      toast.error("Failed to complete plan");
      return false;
    }
  };

  return {
    plans,
    isLoading,
    refetch: fetchPlans,
    createPlan,
    addCheckpoint,
    completePlan,
    activePlansCount: plans.filter((p) => p.current_status === "active").length,
  };
}

// Rating options for UI
export const RATING_OPTIONS = [
  { value: "exceeds", label: "Exceeds Expectations", color: "text-green-600", score: 5 },
  { value: "meets", label: "Meets Expectations", color: "text-blue-600", score: 4 },
  { value: "developing", label: "Developing", color: "text-yellow-600", score: 3 },
  { value: "below", label: "Below Expectations", color: "text-orange-600", score: 2 },
  { value: "unacceptable", label: "Unacceptable", color: "text-red-600", score: 1 },
];

// Severity options for incidents
export const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor", description: "Coaching needed", color: "text-yellow-600" },
  { value: "moderate", label: "Moderate", description: "Formal warning", color: "text-orange-600" },
  { value: "major", label: "Major", description: "Remediation required", color: "text-red-600" },
  { value: "critical", label: "Critical", description: "Immediate action required", color: "text-red-800" },
];

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

// Note: These tables are created by migration 20240311000000_nremt_skill_sheets.sql
// Using 'as any' until types are regenerated from Supabase

export type CertificationLevel = "EMR" | "EMT" | "AEMT" | "Paramedic";

export interface SkillStep {
  id: string;
  step_number: number;
  description: string;
  is_critical: boolean;
  points?: number;
}

export interface SkillSheetTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  skill_code: string;
  certification_level: CertificationLevel;
  category: string;
  description: string | null;
  time_limit_seconds: number | null;
  passing_score: number;
  steps: SkillStep[];
  critical_criteria: string[];
  is_nremt_official: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export type AttemptStatus = "in_progress" | "passed" | "failed" | "needs_remediation";

export interface StepResult {
  step_id: string;
  completed: boolean;
  notes?: string;
}

export interface SkillSheetAttempt {
  id: string;
  tenant_id: string;
  template_id: string;
  student_id: string;
  course_id: string | null;
  evaluator_id: string | null;
  attempt_number: number;
  status: AttemptStatus;
  step_results: StepResult[];
  critical_failures: string[];
  total_score: number | null;
  time_taken_seconds: number | null;
  evaluator_notes: string | null;
  student_notes: string | null;
  started_at: string;
  completed_at: string | null;
  verified_at: string | null;
  created_at: string;
  template?: SkillSheetTemplate;
  student?: { id: string; full_name: string; email: string };
  evaluator?: { id: string; full_name: string };
}

export interface SkillSheetFilters {
  certificationLevel?: CertificationLevel;
  category?: string;
  isNremtOfficial?: boolean;
  search?: string;
}

// Hook for skill sheet templates
export function useSkillSheetTemplates(filters?: SkillSheetFilters) {
  const [templates, setTemplates] = useState<SkillSheetTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filters to use as stable dependency
  const filterKey = JSON.stringify(filters || {});

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("skill_sheet_templates")
        .select("*")
        .eq("is_active", true);

      if (filters?.certificationLevel) {
        query = query.eq("certification_level", filters.certificationLevel);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.isNremtOfficial !== undefined) {
        query = query.eq("is_nremt_official", filters.isNremtOfficial);
      }
      if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order("certification_level").order("category").order("name");

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skill sheet templates"));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
  };
}

// Hook for a single skill sheet template
export function useSkillSheetTemplate(templateId: string) {
  const [template, setTemplate] = useState<SkillSheetTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!templateId) {
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase as any)
          .from("skill_sheet_templates")
          .select("*")
          .eq("id", templateId)
          .single();

        if (fetchError) throw fetchError;
        setTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch skill sheet template"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  return { template, isLoading, error };
}

// Hook for skill sheet attempts
export function useSkillSheetAttempts(options?: {
  studentId?: string;
  templateId?: string;
  courseId?: string;
  status?: AttemptStatus;
}) {
  const [attempts, setAttempts] = useState<SkillSheetAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();

  // Serialize options to use as stable dependency
  const optionsKey = JSON.stringify(options || {});

  const fetchAttempts = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("skill_sheet_attempts")
        .select(`
          *,
          template:skill_sheet_templates(*),
          student:users!skill_sheet_attempts_student_id_fkey(id, full_name, email),
          evaluator:users!skill_sheet_attempts_evaluator_id_fkey(id, full_name)
        `);

      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }
      if (options?.templateId) {
        query = query.eq("template_id", options.templateId);
      }
      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setAttempts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skill sheet attempts"));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  // Start a new attempt
  const startAttempt = async (templateId: string, courseId?: string): Promise<SkillSheetAttempt | null> => {
    try {
      const supabase = createClient();
      // Get current attempt count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("skill_sheet_attempts")
        .select("*", { count: "exact", head: true })
        .eq("template_id", templateId)
        .eq("student_id", profile?.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .insert({
          tenant_id: profile?.tenant_id,
          template_id: templateId,
          student_id: profile?.id,
          course_id: courseId,
          attempt_number: (count || 0) + 1,
          status: "in_progress",
          step_results: [],
          critical_failures: [],
          started_at: new Date().toISOString(),
        })
        .select(`
          *,
          template:skill_sheet_templates(*)
        `)
        .single();

      if (insertError) throw insertError;
      setAttempts((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      toast.error("Failed to start skill sheet attempt");
      return null;
    }
  };

  // Update an in-progress attempt
  const updateAttempt = async (
    attemptId: string,
    updates: {
      step_results?: StepResult[];
      critical_failures?: string[];
      student_notes?: string;
    }
  ): Promise<boolean> => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .update(updates)
        .eq("id", attemptId);

      if (updateError) throw updateError;
      setAttempts((prev) =>
        prev.map((a) => (a.id === attemptId ? { ...a, ...updates } : a))
      );
      return true;
    } catch (err) {
      toast.error("Failed to update attempt");
      return false;
    }
  };

  // Submit attempt for evaluation
  const submitAttempt = async (attemptId: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .update({
          status: "needs_remediation", // Waiting for evaluator
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (updateError) throw updateError;
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? { ...a, status: "needs_remediation" as AttemptStatus, completed_at: new Date().toISOString() }
            : a
        )
      );
      toast.success("Skill sheet submitted for evaluation");
      return true;
    } catch (err) {
      toast.error("Failed to submit attempt");
      return false;
    }
  };

  // Grade an attempt (instructor only)
  const gradeAttempt = async (
    attemptId: string,
    grading: {
      step_results: StepResult[];
      critical_failures: string[];
      total_score: number;
      status: "passed" | "failed";
      evaluator_notes?: string;
      time_taken_seconds?: number;
    }
  ): Promise<boolean> => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .update({
          ...grading,
          evaluator_id: profile?.id,
          verified_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (updateError) throw updateError;
      toast.success(`Skill sheet marked as ${grading.status}`);
      fetchAttempts();
      return true;
    } catch (err) {
      toast.error("Failed to grade attempt");
      return false;
    }
  };

  return {
    attempts,
    isLoading,
    error,
    refetch: fetchAttempts,
    startAttempt,
    updateAttempt,
    submitAttempt,
    gradeAttempt,
  };
}

// Hook for student's skill sheet progress
export function useStudentSkillProgress(studentId?: string) {
  const [progress, setProgress] = useState<{
    totalTemplates: number;
    passedCount: number;
    failedCount: number;
    pendingCount: number;
    byCategory: Record<string, { passed: number; total: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();

  const effectiveStudentId = studentId || profile?.id;

  useEffect(() => {
    if (!effectiveStudentId) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Get all templates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: templates } = await (supabase as any)
          .from("skill_sheet_templates")
          .select("id, category")
          .eq("is_active", true);

        // Get student's best attempts (passed ones)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attempts } = await (supabase as any)
          .from("skill_sheet_attempts")
          .select("template_id, status")
          .eq("student_id", effectiveStudentId);

        if (!templates) {
          setProgress(null);
          return;
        }

        const passedTemplates = new Set(
          attempts?.filter((a: { status: string }) => a.status === "passed").map((a: { template_id: string }) => a.template_id) || []
        );
        const failedTemplates = new Set(
          attempts?.filter((a: { status: string }) => a.status === "failed").map((a: { template_id: string }) => a.template_id) || []
        );
        const pendingTemplates = new Set(
          attempts?.filter((a: { status: string }) => a.status === "in_progress" || a.status === "needs_remediation").map((a: { template_id: string }) => a.template_id) || []
        );

        const byCategory: Record<string, { passed: number; total: number }> = {};
        templates.forEach((t: { id: string; category: string }) => {
          if (!byCategory[t.category]) {
            byCategory[t.category] = { passed: 0, total: 0 };
          }
          byCategory[t.category].total++;
          if (passedTemplates.has(t.id)) {
            byCategory[t.category].passed++;
          }
        });

        setProgress({
          totalTemplates: templates.length,
          passedCount: passedTemplates.size,
          failedCount: failedTemplates.size,
          pendingCount: pendingTemplates.size,
          byCategory,
        });
      } catch (err) {
        console.error("Failed to fetch skill progress:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [effectiveStudentId]);

  return { progress, isLoading };
}

// Get unique categories from templates
export function useSkillCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("skill_sheet_templates")
          .select("category")
          .eq("is_active", true);

        if (data) {
          const uniqueCategories = [...new Set(data.map((d: { category: string }) => d.category))];
          setCategories(uniqueCategories.sort() as string[]);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading };
}

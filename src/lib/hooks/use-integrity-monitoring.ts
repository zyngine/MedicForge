"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

// Review decision options
export const REVIEW_DECISIONS = [
  { value: "cleared", label: "Cleared", description: "No academic integrity issue found" },
  { value: "warning", label: "Warning", description: "Minor issue, student warned" },
  { value: "violation", label: "Violation", description: "Academic integrity violation confirmed" },
] as const;

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]["value"];

export interface IntegrityEvent {
  id: string;
  attempt_id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event_data: Record<string, any>;
  question_id: string | null;
  question_number: number | null;
  timestamp: string;
  suspicion_level: "low" | "medium" | "high";
  created_at: string;
}

export interface IntegritySummary {
  id: string;
  attempt_id: string;
  tenant_id: string;
  user_id: string;
  total_events: number;
  high_suspicion_events: number;
  medium_suspicion_events: number;
  low_suspicion_events: number;
  blur_count: number;
  copy_count: number;
  paste_count: number;
  right_click_count: number;
  shortcut_count: number;
  devtools_count: number;
  flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  auto_flagged: boolean;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  review_decision: ReviewDecision | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student?: { id: string; full_name: string; email: string };
  reviewer?: { id: string; full_name: string };
}

export interface FlaggedAttempt {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  exam_id: string;
  exam_name: string;
  started_at: string | null;
  submitted_at: string | null;
  total_events: number;
  high_suspicion_events: number;
  medium_suspicion_events: number;
  flagged_reason: string | null;
  flagged_at: string | null;
  auto_flagged: boolean;
  reviewed: boolean;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
}

// ========== Flagged Attempts ==========

// Fetch all flagged attempts
export function useFlaggedAttempts(options?: { reviewed?: boolean; examId?: string }) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["flagged-attempts", tenant?.id, options?.reviewed, options?.examId],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_flagged_attempts", {
        p_tenant_id: tenant.id,
        p_reviewed: options?.reviewed ?? null,
        p_exam_id: options?.examId || null,
      });

      if (error) throw error;
      return (data || []) as FlaggedAttempt[];
    },
    enabled: !!tenant?.id,
  });
}

// ========== Single Attempt Details ==========

// Fetch integrity summary for an attempt
export function useIntegritySummary(attemptId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["integrity-summary", tenant?.id, attemptId],
    queryFn: async () => {
      if (!tenant?.id || !attemptId) return null;

      const supabase = getDb();

      const { data, error } = await supabase
        .from("quiz_integrity_summary")
        .select("*")
        .eq("attempt_id", attemptId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

      if (!data) return null;

      // Fetch student and reviewer info
      const userIds = [data.user_id, data.reviewed_by].filter(Boolean);
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      return {
        ...data,
        student: userMap.get(data.user_id) || null,
        reviewer: userMap.get(data.reviewed_by) || null,
      } as IntegritySummary;
    },
    enabled: !!tenant?.id && !!attemptId,
  });
}

// Fetch integrity events for an attempt
export function useIntegrityEvents(attemptId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["integrity-events", tenant?.id, attemptId],
    queryFn: async () => {
      if (!tenant?.id || !attemptId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("quiz_integrity_events")
        .select("*")
        .eq("attempt_id", attemptId)
        .eq("tenant_id", tenant.id)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return (data || []) as IntegrityEvent[];
    },
    enabled: !!tenant?.id && !!attemptId,
  });
}

// ========== Review Actions ==========

// Submit review for an attempt
export function useReviewAttempt() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      decision,
      notes,
    }: {
      attemptId: string;
      decision: ReviewDecision;
      notes?: string;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase.rpc("review_integrity_attempt", {
        p_attempt_id: attemptId,
        p_reviewer_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to submit review");

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flagged-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["integrity-summary", tenant?.id, variables.attemptId] });
    },
  });
}

// Manually flag an attempt
export function useFlagAttempt() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      reason,
    }: {
      attemptId: string;
      reason: string;
    }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("quiz_integrity_summary")
        .update({
          flagged: true,
          flagged_reason: reason,
          flagged_at: new Date().toISOString(),
          auto_flagged: false,
        })
        .eq("attempt_id", attemptId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flagged-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["integrity-summary"] });
    },
  });
}

// ========== Stats ==========

// Fetch integrity statistics for an exam
export function useExamIntegrityStats(examId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["exam-integrity-stats", tenant?.id, examId],
    queryFn: async () => {
      if (!tenant?.id || !examId) return null;

      const supabase = getDb();

      // Get all summaries for this exam
      const { data: summaries, error } = await supabase
        .from("quiz_integrity_summary")
        .select(`
          *,
          attempt:exam_attempts!inner(exam_id)
        `)
        .eq("tenant_id", tenant.id)
        .eq("attempt.exam_id", examId);

      if (error) throw error;

      const data = summaries || [];
      const total = data.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flagged = data.filter((s: any) => s.flagged).length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reviewed = data.filter((s: any) => s.reviewed).length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pending = flagged - data.filter((s: any) => s.flagged && s.reviewed).length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const violations = data.filter((s: any) => s.review_decision === "violation").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warnings = data.filter((s: any) => s.review_decision === "warning").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleared = data.filter((s: any) => s.review_decision === "cleared").length;

      const avgEvents = total > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? data.reduce((sum: number, s: any) => sum + s.total_events, 0) / total
        : 0;

      return {
        total_attempts: total,
        flagged_count: flagged,
        reviewed_count: reviewed,
        pending_review: pending,
        violations,
        warnings,
        cleared,
        average_events: Math.round(avgEvents * 10) / 10,
      };
    },
    enabled: !!tenant?.id && !!examId,
  });
}

// ========== Helpers ==========

// Get event type label
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    blur: "Window Lost Focus",
    focus: "Window Gained Focus",
    copy: "Copy Attempt",
    paste: "Paste Attempt",
    cut: "Cut Attempt",
    right_click: "Right Click",
    print: "Print Attempt",
    screenshot: "Screenshot Attempt",
    shortcut: "Keyboard Shortcut",
    selection: "Text Selection",
    resize: "Window Resize",
    devtools: "Developer Tools",
    tab_hidden: "Tab Hidden",
    tab_visible: "Tab Visible",
  };
  return labels[eventType] || eventType;
}

// Get event type icon/color
export function getEventSeverityColor(level: string): string {
  switch (level) {
    case "high":
      return "text-red-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-gray-500";
    default:
      return "text-gray-400";
  }
}

// Get review decision badge variant
export function getDecisionBadgeVariant(decision: string | null): "success" | "warning" | "destructive" | "secondary" {
  switch (decision) {
    case "cleared":
      return "success";
    case "warning":
      return "warning";
    case "violation":
      return "destructive";
    default:
      return "secondary";
  }
}

// Get review decision label
export function getDecisionLabel(decision: string | null): string {
  const found = REVIEW_DECISIONS.find((d) => d.value === decision);
  return found?.label || "Pending";
}

// Format event count summary
export function formatEventSummary(summary: IntegritySummary): string {
  const parts: string[] = [];
  if (summary.blur_count > 0) parts.push(`${summary.blur_count} blur`);
  if (summary.copy_count > 0) parts.push(`${summary.copy_count} copy`);
  if (summary.paste_count > 0) parts.push(`${summary.paste_count} paste`);
  if (summary.devtools_count > 0) parts.push(`${summary.devtools_count} devtools`);
  if (summary.shortcut_count > 0) parts.push(`${summary.shortcut_count} shortcuts`);
  if (summary.right_click_count > 0) parts.push(`${summary.right_click_count} right-click`);
  return parts.join(", ") || "No events";
}

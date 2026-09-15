"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";


export const VITALS_CONTEXTS = [
  { value: "lab", label: "Skills lab" },
  { value: "clinical", label: "Clinical rotation" },
  { value: "field", label: "Field / ride-along" },
  { value: "other", label: "Other" },
] as const;

export const VITALS_SUBJECT_TYPES = [
  { value: "classmate", label: "Classmate" },
  { value: "patient", label: "Patient" },
  { value: "volunteer", label: "Volunteer" },
  { value: "manikin", label: "Manikin / simulator" },
] as const;

export const BP_METHODS = [
  { value: "auscultated", label: "Auscultated" },
  { value: "palpated", label: "Palpated" },
  { value: "monitor", label: "Monitor / NIBP" },
] as const;

export interface VitalSignEntry {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string | null;
  recorded_at: string;
  context: string;
  setting: string | null;
  subject_type: string | null;
  subject_age_range: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  bp_method: string | null;
  pulse: number | null;
  pulse_quality: string | null;
  respiratory_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  blood_glucose: number | null;
  gcs: number | null;
  pain_scale: number | null;
  skin: string | null;
  pupils: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VitalSignInput = Partial<
  Omit<VitalSignEntry, "id" | "tenant_id" | "student_id" | "created_at" | "updated_at">
>;

export interface VitalsProgress {
  student_id: string;
  logged_standalone: number;
  logged_in_patient_contacts: number;
  logged_total: number;
  required_total: number | null;
  remaining: number | null;
}

export interface VitalsRosterRow {
  student_id: string;
  full_name: string;
  email: string;
  logged_standalone: number;
  logged_in_patient_contacts: number;
  logged_total: number;
  required_total: number | null;
  remaining: number | null;
  last_logged_at: string | null;
}

/** The signed-in student's own log, newest first. */
export function useMyVitalSigns(limit = 200) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["my-vital-signs", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("student_vital_signs")
        .select("*")
        .eq("student_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as VitalSignEntry[];
    },
    enabled: !!user?.id,
  });
}

/**
 * How many sets logged, how many required.
 *
 * Counts the standalone log and the sets already inside the student's patient
 * contact reports as one total — a set documented on a patient contact counts,
 * and is not re-keyed here.
 *
 * Pass a studentId to look at someone else; that only returns anything for an
 * admin or instructor in the same tenant.
 */
export function useVitalsProgress(studentId?: string) {
  const { user } = useUser();
  const target = studentId ?? user?.id;

  return useQuery({
    queryKey: ["vitals-progress", target],
    queryFn: async () => {
      if (!target) return null;

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_student_vitals_progress", {
        p_student_id: target,
      });

      if (error) throw error;
      const rows = (data || []) as VitalsProgress[];
      return rows[0] ?? null;
    },
    enabled: !!target,
  });
}

/** Who in a course is short of the requirement. Instructors and admins only. */
export function useCourseVitalsRoster(courseId: string | null) {
  return useQuery({
    queryKey: ["course-vitals-roster", courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_course_vitals_roster", {
        p_course_id: courseId,
      });

      if (error) throw error;
      return (data || []) as VitalsRosterRow[];
    },
    enabled: !!courseId,
  });
}

export function useCreateVitalSign() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VitalSignInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("student_vital_signs")
        .insert({
          ...input,
          tenant_id: tenant.id,
          student_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as VitalSignEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vital-signs"] });
      queryClient.invalidateQueries({ queryKey: ["vitals-progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-vitals-roster"] });
    },
  });
}

export function useDeleteVitalSign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("student_vital_signs").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vital-signs"] });
      queryClient.invalidateQueries({ queryKey: ["vitals-progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-vitals-roster"] });
    },
  });
}

/** Label for a stored context value. */
export function getContextLabel(value: string | null): string {
  if (!value) return "—";
  return VITALS_CONTEXTS.find((c) => c.value === value)?.label ?? value;
}

/**
 * Compact one-line summary of a set, for a table row.
 *
 * Only shows what was actually recorded: a set taken without a thermometer
 * should read "128/82 · HR 76", not "128/82 · HR 76 · Temp —".
 */
export function formatVitalsSummary(v: VitalSignEntry): string {
  const parts: string[] = [];
  if (v.bp_systolic != null || v.bp_diastolic != null) {
    parts.push(`${v.bp_systolic ?? "?"}/${v.bp_diastolic ?? "?"}`);
  }
  if (v.pulse != null) parts.push(`HR ${v.pulse}`);
  if (v.respiratory_rate != null) parts.push(`RR ${v.respiratory_rate}`);
  if (v.spo2 != null) parts.push(`SpO2 ${v.spo2}%`);
  if (v.temperature != null) parts.push(`${v.temperature}°F`);
  if (v.blood_glucose != null) parts.push(`BGL ${v.blood_glucose}`);
  if (v.gcs != null) parts.push(`GCS ${v.gcs}`);
  if (v.pain_scale != null) parts.push(`Pain ${v.pain_scale}`);
  return parts.length > 0 ? parts.join(" · ") : "No values recorded";
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { contactVitalsEntry, type VitalsMeasurements } from "@/lib/vitals-format";

// Re-exported so callers keep importing vitals helpers from one place.
export {
  formatVitalsSummary,
  contactVitalsEntry,
  type VitalsMeasurements,
} from "@/lib/vitals-format";


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

// ========== One student's sets, for an instructor ==========

export interface VitalsTimelineEntry {
  /** Stable key for React; ids are not unique across the two sources. */
  key: string;
  /** When it was taken, ISO. Patient contact sets fall back to the report's date. */
  recordedAt: string;
  /** Wall-clock time the student wrote on the set, when there is one. */
  timeLabel: string | null;
  source: "log" | "patient_contact";
  /** "Skills lab", or the patient contact's chief complaint. */
  label: string;
  measurements: VitalsMeasurements;
  notes: string | null;
}

/**
 * Every set one student has documented, from both places they live, newest
 * first.
 *
 * The roster counts standalone rows and patient contact sets together, so
 * opening a student has to show both — a student sitting at 10 whose drill-in
 * listed only the 3 they typed here would look like a bug.
 *
 * Authorization is the RLS policies', not this query's: staff can read
 * student_vital_signs in their tenant and all patient contacts in their tenant,
 * and a student reaching for someone else gets nothing back.
 */
export function useStudentVitalsDetail(studentId: string | null) {
  return useQuery({
    queryKey: ["student-vitals-detail", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const supabase = createClient();

      const [{ data: logged, error: logError }, { data: contacts, error: contactError }] =
        await Promise.all([
          supabase
            .from("student_vital_signs")
            .select("*")
            .eq("student_id", studentId)
            .order("recorded_at", { ascending: false }),
          supabase
            .from("clinical_patient_contacts")
            .select("id, vitals, chief_complaint, created_at")
            .eq("student_id", studentId),
        ]);

      if (logError) throw logError;
      if (contactError) throw contactError;

      const entries: VitalsTimelineEntry[] = [];

      for (const row of (logged || []) as VitalSignEntry[]) {
        entries.push({
          key: `log:${row.id}`,
          recordedAt: row.recorded_at,
          timeLabel: null,
          source: "log",
          label: [getContextLabel(row.context), row.setting].filter(Boolean).join(" · "),
          measurements: row,
          notes: row.notes,
        });
      }

      for (const contact of contacts || []) {
        const raw = (contact as { vitals?: unknown }).vitals;
        if (!Array.isArray(raw)) continue;

        raw.forEach((item, index) => {
          const parsed = contactVitalsEntry(item);
          const { time, ...measurements } = parsed;
          entries.push({
            key: `contact:${contact.id}:${index}`,
            // A set inside a report carries a wall-clock time but no date, so
            // the report's own date is the best anchor available.
            recordedAt: contact.created_at as string,
            timeLabel: time ?? null,
            source: "patient_contact",
            label: contact.chief_complaint || "Patient contact",
            measurements,
            notes: null,
          });
        });
      }

      entries.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return entries;
    },
    enabled: !!studentId,
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import type { ClinicalLog, User } from "@/types";

type LogType = "hours" | "patient_contact";
type VerificationStatus = "pending" | "verified" | "rejected";

export interface ClinicalLogWithDetails extends ClinicalLog {
  student?: Pick<User, "id" | "full_name" | "email">;
  verifier?: Pick<User, "id" | "full_name" | "email">;
}

export interface ClinicalLogForm {
  courseId: string;
  logType: LogType;
  date: string;
  hours?: number;
  siteName?: string;
  siteType?: string;
  supervisorName?: string;
  supervisorCredentials?: string;
  activities?: string[];
  patientInfo?: {
    ageGroup: string;
    chiefComplaint: string;
    impression: string;
  };
  skillsPerformed?: string[];
  wasTeamLead?: boolean;
  notes?: string;
}

export interface ClinicalHoursSummary {
  totalHours: number;
  verifiedHours: number;
  pendingHours: number;
  patientContacts: number;
  verifiedContacts: number;
  teamLeadCount: number;
  byMonth: { month: string; hours: number }[];
}

interface UseClinicalLogsOptions {
  studentId?: string;
  courseId?: string;
  logType?: LogType;
  verificationStatus?: VerificationStatus;
}

// Query keys
const clinicalLogsKeys = {
  all: ["clinical-logs"] as const,
  lists: () => [...clinicalLogsKeys.all, "list"] as const,
  list: (options: UseClinicalLogsOptions) =>
    [...clinicalLogsKeys.lists(), options] as const,
  details: () => [...clinicalLogsKeys.all, "detail"] as const,
  detail: (id: string) => [...clinicalLogsKeys.details(), id] as const,
  summaries: () => [...clinicalLogsKeys.all, "summary"] as const,
  summary: (studentId: string, courseId: string) =>
    [...clinicalLogsKeys.summaries(), studentId, courseId] as const,
};

// Fetch clinical logs
async function fetchClinicalLogs(
  options: UseClinicalLogsOptions
): Promise<ClinicalLogWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from("clinical_logs")
    .select(
      `
      *,
      student:users!clinical_logs_student_id_fkey(id, full_name, email),
      verifier:users!clinical_logs_verified_by_fkey(id, full_name, email)
    `
    )
    .order("date", { ascending: false });

  if (options.studentId) {
    query = query.eq("student_id", options.studentId);
  }

  if (options.courseId) {
    query = query.eq("course_id", options.courseId);
  }

  if (options.logType) {
    query = query.eq("log_type", options.logType);
  }

  if (options.verificationStatus) {
    query = query.eq("verification_status", options.verificationStatus);
  }

  const { data, error } = await query;

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((log: any) => ({
    ...log,
    student: log.student || undefined,
    verifier: log.verifier || undefined,
  }));
}

// Fetch single clinical log
async function fetchClinicalLog(
  logId: string
): Promise<ClinicalLogWithDetails> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinical_logs")
    .select(
      `
      *,
      student:users!clinical_logs_student_id_fkey(id, full_name, email),
      verifier:users!clinical_logs_verified_by_fkey(id, full_name, email)
    `
    )
    .eq("id", logId)
    .single();

  if (error) throw error;

  return {
    ...data,
    student: data.student || undefined,
    verifier: data.verifier || undefined,
  } as ClinicalLogWithDetails;
}

// Fetch clinical hours summary
async function fetchClinicalHoursSummary(
  studentId: string,
  courseId: string
): Promise<ClinicalHoursSummary> {
  const supabase = createClient();

  const { data: logs, error } = await supabase
    .from("clinical_logs")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoursLogs = (logs || []).filter((l: any) => l.log_type === "hours");
  const contactLogs = (logs || []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => l.log_type === "patient_contact"
  );

  const totalHours = hoursLogs.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, l: any) => sum + (l.hours || 0),
    0
  );
  const verifiedHours = hoursLogs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l.verification_status === "verified")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((sum: number, l: any) => sum + (l.hours || 0), 0);
  const pendingHours = hoursLogs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l.verification_status === "pending")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((sum: number, l: any) => sum + (l.hours || 0), 0);

  const patientContacts = contactLogs.length;
  const verifiedContacts = contactLogs.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => l.verification_status === "verified"
  ).length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamLeadCount = (logs || []).filter((l: any) => l.was_team_lead).length;

  // Group hours by month
  const monthMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hoursLogs.forEach((log: any) => {
    const month = log.date.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) || 0;
    monthMap.set(month, existing + (log.hours || 0));
  });

  const byMonth = Array.from(monthMap.entries())
    .map(([month, hours]) => ({ month, hours }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalHours,
    verifiedHours,
    pendingHours,
    patientContacts,
    verifiedContacts,
    teamLeadCount,
    byMonth,
  };
}

// Main hook for clinical logs with filtering
export function useClinicalLogs(options: UseClinicalLogsOptions = {}) {
  return useQuery({
    queryKey: clinicalLogsKeys.list(options),
    queryFn: () => fetchClinicalLogs(options),
  });
}

// Hook for getting a single clinical log
export function useClinicalLog(logId: string | null) {
  return useQuery({
    queryKey: clinicalLogsKeys.detail(logId || ""),
    queryFn: () => fetchClinicalLog(logId!),
    enabled: !!logId,
  });
}

// Hook for current user's clinical logs
export function useMyClinicalLogs(courseId?: string) {
  const { user } = useUser();

  return useClinicalLogs({
    studentId: user?.id,
    courseId,
  });
}

// Hook for student's total hours summary
export function useStudentClinicalHours(
  studentId: string | null,
  courseId: string | null
) {
  return useQuery({
    queryKey: clinicalLogsKeys.summary(studentId || "", courseId || ""),
    queryFn: () => fetchClinicalHoursSummary(studentId!, courseId!),
    enabled: !!studentId && !!courseId,
  });
}

// Hook for pending verification logs (instructor view)
export function usePendingVerificationLogs(courseId?: string) {
  return useClinicalLogs({
    courseId,
    verificationStatus: "pending",
  });
}

// Mutation: Create clinical log
export function useCreateClinicalLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logData: ClinicalLogForm) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from("clinical_logs")
        .insert([
          {
            tenant_id: userData.tenant_id,
            student_id: user.id,
            course_id: logData.courseId,
            log_type: logData.logType,
            date: logData.date,
            hours: logData.hours || null,
            site_name: logData.siteName || null,
            site_type: logData.siteType || null,
            supervisor_name: logData.supervisorName || null,
            supervisor_credentials: logData.supervisorCredentials || null,
            activities: logData.activities || null,
            patient_info: logData.patientInfo || null,
            skills_performed: logData.skillsPerformed || null,
            was_team_lead: logData.wasTeamLead || false,
            notes: logData.notes || null,
            verification_status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as ClinicalLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalLogsKeys.all });
    },
  });
}

// Mutation: Update clinical log
export function useUpdateClinicalLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logId,
      updates,
    }: {
      logId: string;
      updates: Partial<ClinicalLogForm>;
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};

      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.hours !== undefined) updateData.hours = updates.hours;
      if (updates.siteName !== undefined)
        updateData.site_name = updates.siteName;
      if (updates.siteType !== undefined)
        updateData.site_type = updates.siteType;
      if (updates.supervisorName !== undefined)
        updateData.supervisor_name = updates.supervisorName;
      if (updates.supervisorCredentials !== undefined)
        updateData.supervisor_credentials = updates.supervisorCredentials;
      if (updates.activities !== undefined)
        updateData.activities = updates.activities;
      if (updates.patientInfo !== undefined)
        updateData.patient_info = updates.patientInfo;
      if (updates.skillsPerformed !== undefined)
        updateData.skills_performed = updates.skillsPerformed;
      if (updates.wasTeamLead !== undefined)
        updateData.was_team_lead = updates.wasTeamLead;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from("clinical_logs")
        .update(updateData)
        .eq("id", logId)
        .select()
        .single();

      if (error) throw error;
      return data as ClinicalLog;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: clinicalLogsKeys.all });
    },
  });
}

// Mutation: Delete clinical log
export function useDeleteClinicalLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("clinical_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;
      return logId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalLogsKeys.all });
    },
  });
}

// Mutation: Verify clinical log (instructor only)
export function useVerifyClinicalLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logId,
      status,
      notes,
    }: {
      logId: string;
      status: "verified" | "rejected";
      notes?: string;
    }) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // If notes provided, get existing log to append to notes
      let finalNotes: string | undefined;
      if (notes) {
        const { data: existingLog } = await supabase
          .from("clinical_logs")
          .select("notes")
          .eq("id", logId)
          .single();

        const existingNotes = existingLog?.notes || "";
        finalNotes = existingNotes
          ? `${existingNotes}\n\nVerification note: ${notes}`
          : `Verification note: ${notes}`;
      }

      const updateData: Record<string, any> = {
        verification_status: status,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      };

      if (finalNotes !== undefined) {
        updateData.notes = finalNotes;
      }

      const { data, error } = await supabase
        .from("clinical_logs")
        .update(updateData)
        .eq("id", logId)
        .select()
        .single();

      if (error) throw error;
      return data as ClinicalLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalLogsKeys.all });
    },
  });
}

// Backward compatibility: Legacy hook that returns object with mutation functions
export function useClinicalLogsLegacy(options: UseClinicalLogsOptions = {}) {
  const query = useClinicalLogs(options);
  const createMutation = useCreateClinicalLog();
  const updateMutation = useUpdateClinicalLog();
  const deleteMutation = useDeleteClinicalLog();
  const verifyMutation = useVerifyClinicalLog();

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createLog: createMutation.mutateAsync,
    updateLog: async (logId: string, updates: Partial<ClinicalLogForm>) =>
      updateMutation.mutateAsync({ logId, updates }),
    deleteLog: async (logId: string) => {
      await deleteMutation.mutateAsync(logId);
      return true;
    },
    verifyLog: async (
      logId: string,
      status: "verified" | "rejected",
      notes?: string
    ) => {
      await verifyMutation.mutateAsync({ logId, status, notes });
      return true;
    },
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClinicalLog, User } from "@/types";

type LogType = "hours" | "patient_contact";
type VerificationStatus = "pending" | "verified" | "rejected";

export interface ClinicalLogWithDetails extends ClinicalLog {
  student?: Pick<User, "id" | "full_name" | "email">;
  verifier?: Pick<User, "id" | "full_name" | "email">;
}

interface ClinicalLogForm {
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

interface UseClinicalLogsOptions {
  studentId?: string;
  courseId?: string;
  logType?: LogType;
  verificationStatus?: VerificationStatus;
}

export function useClinicalLogs(options: UseClinicalLogsOptions = {}) {
  const [logs, setLogs] = useState<ClinicalLogWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("clinical_logs")
        .select(`
          *,
          student:users!clinical_logs_student_id_fkey(id, full_name, email),
          verifier:users!clinical_logs_verified_by_fkey(id, full_name, email)
        `)
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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedLogs: ClinicalLogWithDetails[] = (data || []).map((log: any) => ({
        ...log,
        student: log.student || undefined,
        verifier: log.verifier || undefined,
      }));

      setLogs(transformedLogs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch clinical logs"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.studentId, options.courseId, options.logType, options.verificationStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = async (logData: ClinicalLogForm): Promise<ClinicalLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("clinical_logs")
        .insert([{
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
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchLogs();
      return data as ClinicalLog;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create clinical log";
      setError(new Error(message));
      throw err;
    }
  };

  const updateLog = async (
    logId: string,
    updates: Partial<ClinicalLogForm>
  ): Promise<ClinicalLog | null> => {
    try {
      const updateData: any = {};

      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.hours !== undefined) updateData.hours = updates.hours;
      if (updates.siteName !== undefined) updateData.site_name = updates.siteName;
      if (updates.siteType !== undefined) updateData.site_type = updates.siteType;
      if (updates.supervisorName !== undefined) updateData.supervisor_name = updates.supervisorName;
      if (updates.supervisorCredentials !== undefined) updateData.supervisor_credentials = updates.supervisorCredentials;
      if (updates.activities !== undefined) updateData.activities = updates.activities;
      if (updates.patientInfo !== undefined) updateData.patient_info = updates.patientInfo;
      if (updates.skillsPerformed !== undefined) updateData.skills_performed = updates.skillsPerformed;
      if (updates.wasTeamLead !== undefined) updateData.was_team_lead = updates.wasTeamLead;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error: updateError } = await supabase
        .from("clinical_logs")
        .update(updateData)
        .eq("id", logId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchLogs();
      return data as ClinicalLog;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update clinical log"));
      return null;
    }
  };

  const deleteLog = async (logId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("clinical_logs")
        .delete()
        .eq("id", logId);

      if (deleteError) throw deleteError;

      setLogs((prev) => prev.filter((log) => log.id !== logId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete clinical log"));
      return false;
    }
  };

  // Verify a clinical log (instructor only)
  const verifyLog = async (
    logId: string,
    status: "verified" | "rejected",
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const updateData: any = {
        verification_status: status,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      };

      if (notes) {
        // Append verification notes to existing notes
        const existingLog = logs.find(l => l.id === logId);
        const existingNotes = existingLog?.notes || "";
        updateData.notes = existingNotes
          ? `${existingNotes}\n\nVerification note: ${notes}`
          : `Verification note: ${notes}`;
      }

      const { error: updateError } = await supabase
        .from("clinical_logs")
        .update(updateData)
        .eq("id", logId);

      if (updateError) throw updateError;

      await fetchLogs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to verify clinical log"));
      return false;
    }
  };

  return {
    logs,
    isLoading,
    error,
    refetch: fetchLogs,
    createLog,
    updateLog,
    deleteLog,
    verifyLog,
  };
}

// Hook for getting a single clinical log
export function useClinicalLog(logId: string | null) {
  const [log, setLog] = useState<ClinicalLogWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchLog = useCallback(async () => {
    if (!logId) {
      setLog(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("clinical_logs")
        .select(`
          *,
          student:users!clinical_logs_student_id_fkey(id, full_name, email),
          verifier:users!clinical_logs_verified_by_fkey(id, full_name, email)
        `)
        .eq("id", logId)
        .single();

      if (fetchError) throw fetchError;

      setLog({
        ...data,
        student: data.student || undefined,
        verifier: data.verifier || undefined,
      } as ClinicalLogWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch clinical log"));
    } finally {
      setIsLoading(false);
    }
  }, [logId, supabase]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  return { log, isLoading, error, refetch: fetchLog };
}

// Hook for current user's clinical logs
export function useMyClinicalLogs(courseId?: string) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setStudentId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return useClinicalLogs({
    studentId: studentId || undefined,
    courseId,
  });
}

// Hook for student's total hours summary
export function useStudentClinicalHours(studentId: string | null, courseId: string | null) {
  const [summary, setSummary] = useState<{
    totalHours: number;
    verifiedHours: number;
    pendingHours: number;
    patientContacts: number;
    verifiedContacts: number;
    teamLeadCount: number;
    byMonth: { month: string; hours: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSummary = useCallback(async () => {
    if (!studentId || !courseId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: logs, error: fetchError } = await supabase
        .from("clinical_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("course_id", courseId);

      if (fetchError) throw fetchError;

      const hoursLogs = (logs || []).filter((l: any) => l.log_type === "hours");
      const contactLogs = (logs || []).filter((l: any) => l.log_type === "patient_contact");

      const totalHours = hoursLogs.reduce((sum: number, l: any) => sum + (l.hours || 0), 0);
      const verifiedHours = hoursLogs
        .filter((l: any) => l.verification_status === "verified")
        .reduce((sum: number, l: any) => sum + (l.hours || 0), 0);
      const pendingHours = hoursLogs
        .filter((l: any) => l.verification_status === "pending")
        .reduce((sum: number, l: any) => sum + (l.hours || 0), 0);

      const patientContacts = contactLogs.length;
      const verifiedContacts = contactLogs.filter(
        (l: any) => l.verification_status === "verified"
      ).length;

      const teamLeadCount = (logs || []).filter((l: any) => l.was_team_lead).length;

      // Group hours by month
      const monthMap = new Map<string, number>();
      hoursLogs.forEach((log: any) => {
        const month = log.date.substring(0, 7); // YYYY-MM
        const existing = monthMap.get(month) || 0;
        monthMap.set(month, existing + (log.hours || 0));
      });

      const byMonth = Array.from(monthMap.entries())
        .map(([month, hours]) => ({ month, hours }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setSummary({
        totalHours,
        verifiedHours,
        pendingHours,
        patientContacts,
        verifiedContacts,
        teamLeadCount,
        byMonth,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch clinical hours summary"));
    } finally {
      setIsLoading(false);
    }
  }, [studentId, courseId, supabase]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, isLoading, error, refetch: fetchSummary };
}

// Hook for pending verification logs (instructor view)
export function usePendingVerificationLogs(courseId?: string) {
  return useClinicalLogs({
    courseId,
    verificationStatus: "pending",
  });
}

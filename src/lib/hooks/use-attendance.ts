"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "left_early";
export type SessionType = "lecture" | "lab" | "clinical" | "exam" | "simulation" | "other";

export interface AttendanceSession {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  session_type: SessionType;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  is_mandatory: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  records?: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  minutes_present: number | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
  student?: { id: string; full_name: string; email: string };
}

export interface StudentAttendanceSummary {
  student_id: string;
  total_sessions: number;
  sessions_present: number;
  sessions_absent: number;
  sessions_late: number;
  sessions_excused: number;
  attendance_rate: number;
  total_minutes_required: number;
  total_minutes_present: number;
}

// Hook for managing attendance sessions
export function useAttendanceSessions(courseId: string) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    if (!courseId || !profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("attendance_sessions")
        .select("*")
        .eq("course_id", courseId)
        .order("scheduled_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (fetchError) throw fetchError;
      setSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch sessions"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (input: {
    title: string;
    session_type: SessionType;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location?: string;
    is_mandatory?: boolean;
    notes?: string;
  }): Promise<AttendanceSession | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in to create sessions");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("attendance_sessions")
        .insert({
          tenant_id: profile.tenant_id,
          course_id: courseId,
          ...input,
          created_by: profile.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setSessions((prev) => [data, ...prev]);
      toast.success("Session created");
      return data;
    } catch (err) {
      toast.error("Failed to create session");
      return null;
    }
  };

  const updateSession = async (
    sessionId: string,
    updates: Partial<AttendanceSession>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("attendance_sessions")
        .update(updates)
        .eq("id", sessionId);

      if (updateError) throw updateError;
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
      );
      toast.success("Session updated");
      return true;
    } catch (err) {
      toast.error("Failed to update session");
      return false;
    }
  };

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("attendance_sessions")
        .delete()
        .eq("id", sessionId);

      if (deleteError) throw deleteError;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete session");
      return false;
    }
  };

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  };
}

// Hook for managing attendance records
export function useAttendanceRecords(sessionId: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchRecords = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("attendance_records")
        .select(`
          *,
          student:users!attendance_records_student_id_fkey(id, full_name, email)
        `)
        .eq("session_id", sessionId)
        .order("recorded_at", { ascending: true });

      if (fetchError) throw fetchError;
      setRecords(data || []);
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, supabase]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const recordAttendance = async (
    studentId: string,
    status: AttendanceStatus,
    options?: {
      check_in_time?: string;
      check_out_time?: string;
      notes?: string;
    }
  ): Promise<AttendanceRecord | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in to record attendance");
      return null;
    }

    try {
      // Check if record already exists
      const existingRecord = records.find((r) => r.student_id === studentId);

      if (existingRecord) {
        // Update existing record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: updateError } = await (supabase as any)
          .from("attendance_records")
          .update({
            status,
            ...options,
            recorded_by: profile.id,
            recorded_at: new Date().toISOString(),
          })
          .eq("id", existingRecord.id)
          .select(`
            *,
            student:users!attendance_records_student_id_fkey(id, full_name, email)
          `)
          .single();

        if (updateError) throw updateError;
        setRecords((prev) =>
          prev.map((r) => (r.id === existingRecord.id ? data : r))
        );
        return data;
      } else {
        // Create new record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: insertError } = await (supabase as any)
          .from("attendance_records")
          .insert({
            tenant_id: profile.tenant_id,
            session_id: sessionId,
            student_id: studentId,
            status,
            ...options,
            recorded_by: profile.id,
          })
          .select(`
            *,
            student:users!attendance_records_student_id_fkey(id, full_name, email)
          `)
          .single();

        if (insertError) throw insertError;
        setRecords((prev) => [...prev, data]);
        return data;
      }
    } catch (err) {
      toast.error("Failed to record attendance");
      return null;
    }
  };

  const bulkRecordAttendance = async (
    studentStatuses: { studentId: string; status: AttendanceStatus }[]
  ): Promise<boolean> => {
    try {
      for (const { studentId, status } of studentStatuses) {
        await recordAttendance(studentId, status);
      }
      toast.success("Attendance recorded");
      return true;
    } catch (err) {
      toast.error("Failed to record attendance");
      return false;
    }
  };

  return {
    records,
    isLoading,
    refetch: fetchRecords,
    recordAttendance,
    bulkRecordAttendance,
  };
}

// Hook for student attendance summary
export function useStudentAttendanceSummary(courseId: string, studentId?: string) {
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const effectiveStudentId = studentId || profile?.id;

  useEffect(() => {
    if (!courseId || !effectiveStudentId) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setIsLoading(true);

        // Get all sessions for course
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessions } = await (supabase as any)
          .from("attendance_sessions")
          .select("id, start_time, end_time")
          .eq("course_id", courseId);

        // Get all records for student
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: records } = await (supabase as any)
          .from("attendance_records")
          .select("session_id, status, minutes_present")
          .eq("student_id", effectiveStudentId);

        if (!sessions) {
          setSummary(null);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recordMap = new Map<string, any>(records?.map((r: any) => [r.session_id, r]) || []);

        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;
        let totalMinutesRequired = 0;
        let totalMinutesPresent = 0;

        sessions.forEach((session: any) => {
          const record = recordMap.get(session.id) as { status: string; minutes_present: number | null } | undefined;
          const sessionMinutes = calculateMinutes(session.start_time, session.end_time);
          totalMinutesRequired += sessionMinutes;

          if (record) {
            switch (record.status) {
              case "present":
                present++;
                totalMinutesPresent += record.minutes_present || sessionMinutes;
                break;
              case "absent":
                absent++;
                break;
              case "late":
                late++;
                totalMinutesPresent += record.minutes_present || sessionMinutes * 0.75;
                break;
              case "excused":
                excused++;
                break;
              case "left_early":
                present++;
                totalMinutesPresent += record.minutes_present || sessionMinutes * 0.5;
                break;
            }
          } else {
            absent++;
          }
        });

        setSummary({
          student_id: effectiveStudentId,
          total_sessions: sessions.length,
          sessions_present: present,
          sessions_absent: absent,
          sessions_late: late,
          sessions_excused: excused,
          attendance_rate: sessions.length > 0
            ? ((present + late + excused) / sessions.length) * 100
            : 0,
          total_minutes_required: totalMinutesRequired,
          total_minutes_present: totalMinutesPresent,
        });
      } catch (err) {
        console.error("Failed to fetch attendance summary:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [courseId, effectiveStudentId, supabase]);

  return { summary, isLoading };
}

function calculateMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}

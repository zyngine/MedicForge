"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

// Day of week constants
export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

// Session types
export const SESSION_TYPES = [
  { value: "lecture", label: "Lecture" },
  { value: "lab", label: "Lab" },
  { value: "clinical", label: "Clinical" },
  { value: "skills", label: "Skills Practice" },
  { value: "exam", label: "Exam" },
  { value: "other", label: "Other" },
] as const;

export type SessionType = (typeof SESSION_TYPES)[number]["value"];

export interface ProgramSchedule {
  id: string;
  program_id: string;
  tenant_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  location: string | null;
  instructor_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  program?: { id: string; name: string };
  instructor?: { id: string; full_name: string };
}

export interface ExcludedDate {
  id: string;
  program_id: string;
  tenant_id: string;
  excluded_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TodaysSession {
  id: string;
  title: string;
  program_id: string;
  program_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  location: string | null;
  session_status: string;
  check_in_count: number;
  has_active_code: boolean;
}

export interface CreateScheduleInput {
  program_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_type?: SessionType;
  location?: string;
  instructor_id?: string;
}

export interface UpdateScheduleInput {
  title?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  session_type?: SessionType;
  location?: string;
  instructor_id?: string;
  is_active?: boolean;
}

// ========== Program Schedules ==========

// Fetch schedules for a program
export function useProgramSchedules(programId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["program-schedules", tenant?.id, programId],
    queryFn: async () => {
      if (!tenant?.id || !programId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_schedules")
        .select(`
          *,
          instructor:users!program_schedules_instructor_id_fkey(id, full_name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as ProgramSchedule[];
    },
    enabled: !!tenant?.id && !!programId,
  });
}

// Create schedule
export function useCreateSchedule() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_schedules")
        .insert({
          tenant_id: tenant.id,
          program_id: input.program_id,
          title: input.title,
          day_of_week: input.day_of_week,
          start_time: input.start_time,
          end_time: input.end_time,
          session_type: input.session_type || "lecture",
          location: input.location || null,
          instructor_id: input.instructor_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProgramSchedule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["program-schedules", tenant?.id, variables.program_id] });
    },
  });
}

// Update schedule
export function useUpdateSchedule() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateScheduleInput & { id: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_schedules")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProgramSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-schedules"] });
    },
  });
}

// Delete schedule
export function useDeleteSchedule() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("program_schedules")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-schedules"] });
    },
  });
}

// ========== Excluded Dates ==========

// Fetch excluded dates for a program
export function useExcludedDates(programId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["excluded-dates", tenant?.id, programId],
    queryFn: async () => {
      if (!tenant?.id || !programId) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_excluded_dates")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .order("excluded_date", { ascending: true });

      if (error) throw error;
      return data as ExcludedDate[];
    },
    enabled: !!tenant?.id && !!programId,
  });
}

// Add excluded date
export function useAddExcludedDate() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { program_id: string; excluded_date: string; reason?: string }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase
        .from("program_excluded_dates")
        .insert({
          tenant_id: tenant.id,
          program_id: input.program_id,
          excluded_date: input.excluded_date,
          reason: input.reason || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ExcludedDate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["excluded-dates", tenant?.id, variables.program_id] });
    },
  });
}

// Remove excluded date
export function useRemoveExcludedDate() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { error } = await supabase
        .from("program_excluded_dates")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excluded-dates"] });
    },
  });
}

// ========== Session Generation ==========

// Generate sessions for a date range
export function useGenerateSessions() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      program_id: string;
      start_date: string;
      end_date: string;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      const { data, error } = await supabase.rpc("generate_attendance_sessions", {
        p_program_id: input.program_id,
        p_tenant_id: tenant.id,
        p_start_date: input.start_date,
        p_end_date: input.end_date,
        p_created_by: user.id,
      });

      if (error) throw error;
      return data as number; // Returns count of sessions created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-attendance-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
    },
  });
}

// ========== Today's Sessions ==========

// Fetch today's sessions for instructor
export function useTodaysSessions() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["todays-sessions", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase.rpc("get_todays_sessions", {
        p_tenant_id: tenant.id,
        p_instructor_id: user?.id || null,
      });

      if (error) throw error;
      return (data || []) as TodaysSession[];
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ========== Program Sessions (upcoming) ==========

// Fetch upcoming sessions for a program
export function useProgramSessions(programId: string | null, days: number = 14) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["program-sessions", tenant?.id, programId, days],
    queryFn: async () => {
      if (!tenant?.id || !programId) return [];

      const supabase = getDb();
      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      const endDateStr = endDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("attendance_sessions")
        .select(`
          *,
          program:cohorts(id, name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .gte("scheduled_date", today)
        .lte("scheduled_date", endDateStr)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && !!programId,
  });
}

// ========== Helpers ==========

// Get day label
export function getDayLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || "";
}

// Get day short label
export function getDayShortLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.short || "";
}

// Get session type label
export function getSessionTypeLabel(type: string): string {
  return SESSION_TYPES.find((t) => t.value === type)?.label || type;
}

// Format time for display (HH:MM -> h:mm AM/PM)
export function formatTimeDisplay(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Group schedules by day
export function groupSchedulesByDay(schedules: ProgramSchedule[]) {
  const grouped = new Map<number, ProgramSchedule[]>();

  schedules.forEach((schedule) => {
    if (!grouped.has(schedule.day_of_week)) {
      grouped.set(schedule.day_of_week, []);
    }
    grouped.get(schedule.day_of_week)!.push(schedule);
  });

  return grouped;
}

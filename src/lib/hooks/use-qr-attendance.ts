"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { generateAttendanceQR } from "@/lib/qrcode-utils";

export interface AttendanceSession {
  id: string;
  tenant_id: string;
  event_id: string;
  created_by: string;
  session_code: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  location_required: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_meters: number | null;
  created_at: string;
  event?: {
    id: string;
    title: string;
    start_time: string;
  };
  checkins_count?: number;
}

export interface AttendanceCheckin {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  checked_in_at: string;
  check_in_method: string;
  device_info: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_valid: boolean;
  notes: string | null;
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Helper to get db with type assertion
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

// Hook for managing attendance sessions (instructor)
export function useAttendanceSessions(eventId?: string) {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["attendance-sessions", tenant?.id, eventId],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const db = getDb();
      let query = db
        .from("attendance_sessions")
        .select(`
          *,
          event:events(id, title, start_time),
          checkins:attendance_checkins(count)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("event_id", eventId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((session: AttendanceSession & { checkins: { count: number }[] }) => ({
        ...session,
        checkins_count: session.checkins?.[0]?.count || 0,
      })) as AttendanceSession[];
    },
    enabled: !!tenant?.id,
  });

  // Create a new attendance session
  const createSession = useMutation({
    mutationFn: async ({
      eventId,
      expiresInMinutes = 30,
      locationRequired = false,
      location,
    }: {
      eventId: string;
      expiresInMinutes?: number;
      locationRequired?: boolean;
      location?: { lat: number; lng: number; radius?: number };
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      const { data, error } = await db
        .from("attendance_sessions")
        .insert({
          tenant_id: tenant.id,
          event_id: eventId,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          location_required: locationRequired,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_radius_meters: location?.radius || 100,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    },
  });

  // End/deactivate a session
  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { error } = await db
        .from("attendance_sessions")
        .update({ is_active: false })
        .eq("id", sessionId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    },
  });

  // Get QR code for a session
  const getQRCode = async (session: AttendanceSession) => {
    if (!tenant?.id) throw new Error("Not authenticated");

    const qrDataUrl = await generateAttendanceQR(
      session.event_id,
      tenant.id,
      session.session_code,
      Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 60000)
    );

    return qrDataUrl;
  };

  return {
    sessions,
    isLoading,
    createSession: createSession.mutateAsync,
    endSession: endSession.mutateAsync,
    getQRCode,
    isCreating: createSession.isPending,
    isEnding: endSession.isPending,
  };
}

// Hook for viewing check-ins for a session (instructor)
export function useSessionCheckins(sessionId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["attendance-checkins", sessionId],
    queryFn: async () => {
      if (!tenant?.id || !sessionId) return [];

      const db = getDb();
      const { data, error } = await db
        .from("attendance_checkins")
        .select(`
          *,
          student:users(id, full_name, email)
        `)
        .eq("session_id", sessionId)
        .eq("tenant_id", tenant.id)
        .order("checked_in_at", { ascending: true });

      if (error) throw error;
      return data as AttendanceCheckin[];
    },
    enabled: !!tenant?.id && !!sessionId,
  });
}

// Hook for student check-in
export function useQRCheckin() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const checkin = useMutation({
    mutationFn: async ({
      sessionCode,
      location,
    }: {
      sessionCode: string;
      location?: { lat: number; lng: number };
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();

      // Call the check_in_student function
      const { data, error } = await db.rpc("check_in_student", {
        p_session_code: sessionCode,
        p_student_id: user.id,
        p_tenant_id: tenant.id,
        p_device_info: navigator.userAgent,
        p_location_lat: location?.lat || null,
        p_location_lng: location?.lng || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; checkin_id?: string; checked_in_at?: string };

      if (!result.success) {
        throw new Error(result.error || "Check-in failed");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checkins"] });
    },
  });

  return {
    checkin: checkin.mutateAsync,
    isChecking: checkin.isPending,
    error: checkin.error,
  };
}

// Hook for student's own check-in history
export function useMyCheckins() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["my-checkins", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("attendance_checkins")
        .select(`
          *,
          session:attendance_sessions(
            id,
            event:events(id, title, start_time)
          )
        `)
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .order("checked_in_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (AttendanceCheckin & {
        session: { id: string; event: { id: string; title: string; start_time: string } };
      })[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

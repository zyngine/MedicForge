"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type VideoMeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface VideoMeeting {
  id: string;
  tenant_id: string;
  course_id: string | null;
  host_id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: VideoMeetingStatus;
  room_id: string | null;
  join_url: string | null;
  host_url: string | null;
  recording_enabled: boolean;
  recording_url: string | null;
  waiting_room_enabled: boolean;
  max_participants: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  created_at: string;
  // Joined
  host?: { id: string; full_name: string };
  course?: { id: string; title: string };
  participants_count?: number;
}

export interface MeetingParticipant {
  id: string;
  tenant_id: string;
  meeting_id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  duration_minutes: number | null;
  is_presenter: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  device_info: Record<string, any> | null;
  user?: { id: string; full_name: string; email: string };
}

export interface BreakoutRoom {
  id: string;
  tenant_id: string;
  meeting_id: string;
  room_name: string;
  room_number: number;
  status: "pending" | "active" | "closed";
  external_room_id: string | null;
  join_url: string | null;
  duration_minutes: number | null;
  started_at: string | null;
  ended_at: string | null;
  assignments?: BreakoutRoomAssignment[];
}

export interface BreakoutRoomAssignment {
  id: string;
  tenant_id: string;
  breakout_room_id: string;
  user_id: string;
  assigned_at: string;
  joined_at: string | null;
  left_at: string | null;
  user?: { id: string; full_name: string };
}

// Hook for video meetings
export function useVideoMeetings(courseId?: string) {
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchMeetings = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("video_meetings")
        .select(`
          *,
          host:users!video_meetings_host_id_fkey(id, full_name),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("scheduled_start", { ascending: true });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMeetings(data || []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (input: {
    course_id?: string;
    title: string;
    description?: string;
    meeting_type?: string;
    scheduled_start: string;
    scheduled_end: string;
    recording_enabled?: boolean;
    waiting_room_enabled?: boolean;
    max_participants?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: Record<string, any>;
  }): Promise<VideoMeeting | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("video_meetings")
        .insert({
          tenant_id: profile.tenant_id,
          host_id: profile.id,
          course_id: input.course_id || null,
          title: input.title,
          description: input.description || null,
          meeting_type: input.meeting_type || "class",
          scheduled_start: input.scheduled_start,
          scheduled_end: input.scheduled_end,
          recording_enabled: input.recording_enabled ?? false,
          waiting_room_enabled: input.waiting_room_enabled ?? true,
          max_participants: input.max_participants || 100,
          settings: input.settings || {},
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      setMeetings((prev) => [...prev, data].sort((a, b) =>
        new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      ));
      toast.success("Meeting scheduled");
      return data;
    } catch (err) {
      console.error("Failed to create meeting:", err);
      toast.error("Failed to schedule meeting");
      return null;
    }
  };

  const updateMeeting = async (
    id: string,
    updates: Partial<VideoMeeting>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meetings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
      toast.success("Meeting updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update meeting");
      return false;
    }
  };

  const startMeeting = async (id: string): Promise<VideoMeeting | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("video_meetings")
        .update({
          status: "live",
          actual_start: new Date().toISOString(),
          // In a real implementation, this would integrate with Jitsi/Twilio/etc.
          room_id: `room_${id.substring(0, 8)}`,
          join_url: `/meeting/${id}/join`,
          host_url: `/meeting/${id}/host`,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setMeetings((prev) => prev.map((m) => (m.id === id ? data : m)));
      toast.success("Meeting started");
      return data;
    } catch (_err) {
      toast.error("Failed to start meeting");
      return null;
    }
  };

  const endMeeting = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meetings")
        .update({
          status: "ended",
          actual_end: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      setMeetings((prev) => prev.map((m) =>
        m.id === id ? { ...m, status: "ended" as VideoMeetingStatus, actual_end: new Date().toISOString() } : m
      ));
      toast.success("Meeting ended");
      return true;
    } catch (_err) {
      toast.error("Failed to end meeting");
      return false;
    }
  };

  const cancelMeeting = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meetings")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
      setMeetings((prev) => prev.map((m) =>
        m.id === id ? { ...m, status: "cancelled" as VideoMeetingStatus } : m
      ));
      toast.success("Meeting cancelled");
      return true;
    } catch (_err) {
      toast.error("Failed to cancel meeting");
      return false;
    }
  };

  // Filter helpers
  const upcomingMeetings = meetings.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduled_start) > new Date()
  );

  const liveMeetings = meetings.filter((m) => m.status === "live");

  const pastMeetings = meetings.filter(
    (m) => m.status === "ended" || (m.status === "scheduled" && new Date(m.scheduled_end) < new Date())
  );

  return {
    meetings,
    upcomingMeetings,
    liveMeetings,
    pastMeetings,
    isLoading,
    refetch: fetchMeetings,
    createMeeting,
    updateMeeting,
    startMeeting,
    endMeeting,
    cancelMeeting,
  };
}

// Hook for meeting participants
export function useMeetingParticipants(meetingId: string) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchParticipants = useCallback(async () => {
    if (!profile?.tenant_id || !meetingId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("video_meeting_participants")
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .eq("meeting_id", meetingId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, meetingId, supabase]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetingId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`meeting-participants-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_meeting_participants",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, supabase, fetchParticipants]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const joinMeeting = async (deviceInfo?: Record<string, any>): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meeting_participants")
        .upsert({
          tenant_id: profile.tenant_id,
          meeting_id: meetingId,
          user_id: profile.id,
          joined_at: new Date().toISOString(),
          device_info: deviceInfo || null,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to join meeting:", err);
      return false;
    }
  };

  const leaveMeeting = async (): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const participant = participants.find((p) => p.user_id === profile.id);
      if (!participant) return false;

      const joinedAt = participant.joined_at ? new Date(participant.joined_at) : new Date();
      const duration = Math.round((new Date().getTime() - joinedAt.getTime()) / 60000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meeting_participants")
        .update({
          left_at: new Date().toISOString(),
          duration_minutes: duration,
        })
        .eq("meeting_id", meetingId)
        .eq("user_id", profile.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to leave meeting:", err);
      return false;
    }
  };

  const makePresenter = async (userId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("video_meeting_participants")
        .update({ is_presenter: true })
        .eq("meeting_id", meetingId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (_err) {
      return false;
    }
  };

  return {
    participants,
    isLoading,
    refetch: fetchParticipants,
    joinMeeting,
    leaveMeeting,
    makePresenter,
    activeCount: participants.filter((p) => p.joined_at && !p.left_at).length,
  };
}

// Hook for breakout rooms
export function useBreakoutRooms(meetingId: string) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchRooms = useCallback(async () => {
    if (!profile?.tenant_id || !meetingId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("breakout_rooms")
        .select(`
          *,
          assignments:breakout_room_assignments(
            *,
            user:users(id, full_name)
          )
        `)
        .eq("meeting_id", meetingId)
        .order("room_number");

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error("Failed to fetch breakout rooms:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, meetingId, supabase]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const createRooms = async (
    count: number,
    durationMinutes?: number
  ): Promise<BreakoutRoom[]> => {
    if (!profile?.tenant_id) return [];

    try {
      const roomsToCreate = Array.from({ length: count }, (_, i) => ({
        tenant_id: profile.tenant_id,
        meeting_id: meetingId,
        room_name: `Room ${i + 1}`,
        room_number: i + 1,
        duration_minutes: durationMinutes || null,
        status: "pending",
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("breakout_rooms")
        .insert(roomsToCreate)
        .select();

      if (error) throw error;
      setRooms(data || []);
      toast.success(`Created ${count} breakout rooms`);
      return data || [];
    } catch (_err) {
      toast.error("Failed to create breakout rooms");
      return [];
    }
  };

  const assignUserToRoom = async (roomId: string, userId: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // First, remove from any other room in this meeting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("breakout_room_assignments")
        .delete()
        .in("breakout_room_id", rooms.map((r) => r.id))
        .eq("user_id", userId);

      // Then assign to the new room
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("breakout_room_assignments")
        .insert({
          tenant_id: profile.tenant_id,
          breakout_room_id: roomId,
          user_id: userId,
        });

      if (error) throw error;
      await fetchRooms();
      return true;
    } catch (_err) {
      return false;
    }
  };

  const autoAssignParticipants = async (participants: string[]): Promise<boolean> => {
    if (!profile?.tenant_id || rooms.length === 0) return false;

    try {
      // Shuffle participants
      const shuffled = [...participants].sort(() => Math.random() - 0.5);

      // Distribute evenly across rooms
      const assignments = shuffled.map((userId, index) => ({
        tenant_id: profile.tenant_id,
        breakout_room_id: rooms[index % rooms.length].id,
        user_id: userId,
      }));

      // Clear existing assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("breakout_room_assignments")
        .delete()
        .in("breakout_room_id", rooms.map((r) => r.id));

      // Insert new assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("breakout_room_assignments")
        .insert(assignments);

      if (error) throw error;
      await fetchRooms();
      toast.success("Participants assigned to breakout rooms");
      return true;
    } catch (_err) {
      toast.error("Failed to assign participants");
      return false;
    }
  };

  const startAllRooms = async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("breakout_rooms")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
        })
        .eq("meeting_id", meetingId);

      if (error) throw error;
      await fetchRooms();
      toast.success("Breakout rooms started");
      return true;
    } catch (_err) {
      toast.error("Failed to start breakout rooms");
      return false;
    }
  };

  const closeAllRooms = async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("breakout_rooms")
        .update({
          status: "closed",
          ended_at: new Date().toISOString(),
        })
        .eq("meeting_id", meetingId);

      if (error) throw error;
      await fetchRooms();
      toast.success("Breakout rooms closed");
      return true;
    } catch (_err) {
      toast.error("Failed to close breakout rooms");
      return false;
    }
  };

  const deleteRooms = async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("breakout_rooms")
        .delete()
        .eq("meeting_id", meetingId);

      if (error) throw error;
      setRooms([]);
      return true;
    } catch (_err) {
      return false;
    }
  };

  return {
    rooms,
    isLoading,
    refetch: fetchRooms,
    createRooms,
    assignUserToRoom,
    autoAssignParticipants,
    startAllRooms,
    closeAllRooms,
    deleteRooms,
  };
}

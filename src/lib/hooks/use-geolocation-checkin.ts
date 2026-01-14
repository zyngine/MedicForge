"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface CheckinZone {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  zone_type: "classroom" | "clinical_site" | "lab" | "event";
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckinEvent {
  id: string;
  tenant_id: string;
  zone_id: string;
  course_id: string | null;
  event_id: string | null;
  title: string;
  checkin_window_start: string;
  checkin_window_end: string;
  require_checkout: boolean;
  checkout_window_end: string | null;
  late_threshold_minutes: number;
  created_by: string;
  created_at: string;
  // Joined
  zone?: CheckinZone;
  course?: { id: string; title: string };
  checkins_count?: number;
}

export interface UserCheckin {
  id: string;
  tenant_id: string;
  checkin_event_id: string;
  user_id: string;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkin_time: string;
  checkin_distance_meters: number | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  checkout_time: string | null;
  checkout_distance_meters: number | null;
  status: "on_time" | "late" | "absent" | "excused";
  device_info: Record<string, unknown> | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  user?: { id: string; full_name: string; email: string };
  event?: CheckinEvent;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// Hook for check-in zones management (admin/instructor)
export function useCheckinZones() {
  const [zones, setZones] = useState<CheckinZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchZones = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("checkin_zones")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("name");

      if (error) throw error;
      setZones(data || []);
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const createZone = async (input: {
    name: string;
    description?: string;
    zone_type: CheckinZone["zone_type"];
    latitude: number;
    longitude: number;
    radius_meters?: number;
    address?: string;
  }): Promise<CheckinZone | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("checkin_zones")
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          description: input.description || null,
          zone_type: input.zone_type,
          latitude: input.latitude,
          longitude: input.longitude,
          radius_meters: input.radius_meters || 100,
          address: input.address || null,
        })
        .select()
        .single();

      if (error) throw error;
      setZones((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Check-in zone created");
      return data;
    } catch (err) {
      toast.error("Failed to create zone");
      return null;
    }
  };

  const updateZone = async (id: string, updates: Partial<CheckinZone>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("checkin_zones")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
      toast.success("Zone updated");
      return true;
    } catch (err) {
      toast.error("Failed to update zone");
      return false;
    }
  };

  const deleteZone = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("checkin_zones")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setZones((prev) => prev.filter((z) => z.id !== id));
      toast.success("Zone deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete zone");
      return false;
    }
  };

  return {
    zones,
    activeZones: zones.filter((z) => z.is_active),
    isLoading,
    refetch: fetchZones,
    createZone,
    updateZone,
    deleteZone,
  };
}

// Hook for check-in events management
export function useCheckinEvents(courseId?: string) {
  const [events, setEvents] = useState<CheckinEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("checkin_events")
        .select(`
          *,
          zone:checkin_zones(*),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("checkin_window_start", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to fetch check-in events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (input: {
    zone_id: string;
    course_id?: string;
    event_id?: string;
    title: string;
    checkin_window_start: string;
    checkin_window_end: string;
    require_checkout?: boolean;
    checkout_window_end?: string;
    late_threshold_minutes?: number;
  }): Promise<CheckinEvent | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("checkin_events")
        .insert({
          tenant_id: profile.tenant_id,
          zone_id: input.zone_id,
          course_id: input.course_id || null,
          event_id: input.event_id || null,
          title: input.title,
          checkin_window_start: input.checkin_window_start,
          checkin_window_end: input.checkin_window_end,
          require_checkout: input.require_checkout ?? false,
          checkout_window_end: input.checkout_window_end || null,
          late_threshold_minutes: input.late_threshold_minutes || 15,
          created_by: profile.id,
        })
        .select(`
          *,
          zone:checkin_zones(*)
        `)
        .single();

      if (error) throw error;
      setEvents((prev) => [data, ...prev]);
      toast.success("Check-in event created");
      return data;
    } catch (err) {
      toast.error("Failed to create event");
      return null;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("checkin_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete event");
      return false;
    }
  };

  // Filter helpers
  const activeEvents = events.filter((e) => {
    const now = new Date();
    const start = new Date(e.checkin_window_start);
    const end = new Date(e.checkin_window_end);
    return now >= start && now <= end;
  });

  const upcomingEvents = events.filter((e) => {
    const now = new Date();
    const start = new Date(e.checkin_window_start);
    return start > now;
  });

  const pastEvents = events.filter((e) => {
    const now = new Date();
    const end = new Date(e.checkin_window_end);
    return end < now;
  });

  return {
    events,
    activeEvents,
    upcomingEvents,
    pastEvents,
    isLoading,
    refetch: fetchEvents,
    createEvent,
    deleteEvent,
  };
}

// Hook for user check-ins
export function useUserCheckin(eventId: string) {
  const [checkin, setCheckin] = useState<UserCheckin | null>(null);
  const [event, setEvent] = useState<CheckinEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  // Fetch event and existing checkin
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id || !profile?.id || !eventId) return;

      try {
        setIsLoading(true);

        // Fetch event with zone
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: eventData, error: eventError } = await (supabase as any)
          .from("checkin_events")
          .select(`
            *,
            zone:checkin_zones(*)
          `)
          .eq("id", eventId)
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // Fetch existing checkin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: checkinData } = await (supabase as any)
          .from("user_checkins")
          .select("*")
          .eq("checkin_event_id", eventId)
          .eq("user_id", profile.id)
          .single();

        setCheckin(checkinData || null);
      } catch (err) {
        console.error("Failed to fetch check-in data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.tenant_id, profile?.id, eventId, supabase]);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCurrentLocation(loc);
          resolve(loc);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Calculate distance between two points
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Check in
  const performCheckin = async (): Promise<UserCheckin | null> => {
    if (!profile?.tenant_id || !profile?.id || !event) {
      toast.error("Unable to check in");
      return null;
    }

    setIsProcessing(true);

    try {
      // Get current location
      const location = await getCurrentLocation();

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };

      // Use database function for atomic check-in with validation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("process_checkin", {
          p_event_id: eventId,
          p_user_id: profile.id,
          p_latitude: location.latitude,
          p_longitude: location.longitude,
          p_device_info: deviceInfo,
        });

      if (error) {
        throw new Error(error.message || "Check-in failed");
      }

      setCheckin(data);
      toast.success(`Checked in successfully! (${data.checkin_distance_meters}m from location)`);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Check-in failed";
      toast.error(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Check out
  const performCheckout = async (): Promise<boolean> => {
    if (!profile?.id || !checkin || !event?.require_checkout) {
      return false;
    }

    setIsProcessing(true);

    try {
      const location = await getCurrentLocation();
      const distance = event.zone
        ? calculateDistance(
            location.latitude,
            location.longitude,
            event.zone.latitude,
            event.zone.longitude
          )
        : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("user_checkins")
        .update({
          checkout_latitude: location.latitude,
          checkout_longitude: location.longitude,
          checkout_time: new Date().toISOString(),
          checkout_distance_meters: distance,
        })
        .eq("id", checkin.id);

      if (error) throw error;

      setCheckin((prev) =>
        prev
          ? {
              ...prev,
              checkout_latitude: location.latitude,
              checkout_longitude: location.longitude,
              checkout_time: new Date().toISOString(),
              checkout_distance_meters: distance,
            }
          : null
      );

      toast.success("Checked out successfully!");
      return true;
    } catch (err) {
      toast.error("Check-out failed");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if within range
  const isWithinRange = currentLocation && event?.zone
    ? calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        event.zone.latitude,
        event.zone.longitude
      ) <= event.zone.radius_meters
    : null;

  // Check if window is open
  const now = new Date();
  const isWindowOpen = event
    ? now >= new Date(event.checkin_window_start) && now <= new Date(event.checkin_window_end)
    : false;

  const canCheckin = isWindowOpen && !checkin && !isProcessing;
  const canCheckout = event?.require_checkout && checkin && !checkin.checkout_time && !isProcessing;

  return {
    event,
    checkin,
    currentLocation,
    isLoading,
    isProcessing,
    isWithinRange,
    isWindowOpen,
    canCheckin,
    canCheckout,
    getCurrentLocation,
    performCheckin,
    performCheckout,
  };
}

// Hook for viewing check-ins (instructor view)
export function useEventCheckins(eventId: string) {
  const [checkins, setCheckins] = useState<UserCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchCheckins = useCallback(async () => {
    if (!profile?.tenant_id || !eventId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("user_checkins")
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .eq("checkin_event_id", eventId)
        .order("checkin_time");

      if (error) throw error;
      setCheckins(data || []);
    } catch (err) {
      console.error("Failed to fetch check-ins:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, eventId, supabase]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const updateStatus = async (
    checkinId: string,
    status: UserCheckin["status"],
    notes?: string
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("user_checkins")
        .update({ status, notes: notes || null })
        .eq("id", checkinId);

      if (error) throw error;
      setCheckins((prev) =>
        prev.map((c) => (c.id === checkinId ? { ...c, status, notes: notes || null } : c))
      );
      toast.success("Status updated");
      return true;
    } catch (err) {
      toast.error("Failed to update status");
      return false;
    }
  };

  // Stats
  const stats = {
    total: checkins.length,
    onTime: checkins.filter((c) => c.status === "on_time").length,
    late: checkins.filter((c) => c.status === "late").length,
    absent: checkins.filter((c) => c.status === "absent").length,
    excused: checkins.filter((c) => c.status === "excused").length,
  };

  return {
    checkins,
    stats,
    isLoading,
    refetch: fetchCheckins,
    updateStatus,
  };
}

// Hook for student's check-in history
export function useMyCheckins() {
  const [checkins, setCheckins] = useState<(UserCheckin & { event?: CheckinEvent })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchMyCheckins = async () => {
      if (!profile?.tenant_id || !profile?.id) return;

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("user_checkins")
          .select(`
            *,
            event:checkin_events(
              *,
              zone:checkin_zones(*)
            )
          `)
          .eq("user_id", profile.id)
          .order("checkin_time", { ascending: false });

        if (error) throw error;
        setCheckins(data || []);
      } catch (err) {
        console.error("Failed to fetch check-in history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyCheckins();
  }, [profile?.tenant_id, profile?.id, supabase]);

  // Stats
  const stats = {
    total: checkins.length,
    onTime: checkins.filter((c) => c.status === "on_time").length,
    late: checkins.filter((c) => c.status === "late").length,
    onTimePercentage:
      checkins.length > 0
        ? (checkins.filter((c) => c.status === "on_time").length / checkins.length) * 100
        : 100,
  };

  return {
    checkins,
    stats,
    isLoading,
  };
}

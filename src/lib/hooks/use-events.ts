"use client";

import { useState, useEffect, useCallback } from "react";

export interface CourseEvent {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  description: string | null;
  event_type: "class" | "lab" | "clinical" | "exam" | "other";
  start_time: string;
  end_time: string;
  location: string | null;
  virtual_link: string | null;
  is_mandatory: boolean;
  course?: { id: string; title: string };
}

interface CreateEventInput {
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  course_id: string;
  description?: string;
  location?: string;
}

export function useEvents() {
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = async (input: CreateEventInput): Promise<CourseEvent> => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create event");
    }
    const event = await res.json();
    setEvents((prev) => [...prev, event].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));
    return event;
  };

  return { events, isLoading, error, createEvent, refetch: fetchEvents };
}

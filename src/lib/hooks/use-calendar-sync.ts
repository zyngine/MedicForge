"use client";

import { useState, useCallback } from "react";
import { useUser } from "./use-user";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
  type: "assignment" | "class" | "clinical" | "exam" | "other";
  courseId?: string;
  courseName?: string;
}

// Generate iCal formatted string for a single event
function generateICalEvent(event: CalendarEvent): string {
  const formatDate = (date: Date, allDay?: boolean) => {
    if (allDay) {
      return date.toISOString().replace(/[-:]/g, "").split("T")[0];
    }
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const escapeText = (text: string) => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === "\n") return "\\n";
      return "\\" + match;
    });
  };

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@medicforge.net`,
    `DTSTAMP:${formatDate(new Date())}`,
    event.allDay
      ? `DTSTART;VALUE=DATE:${formatDate(event.start, true)}`
      : `DTSTART:${formatDate(event.start)}`,
    event.allDay
      ? `DTEND;VALUE=DATE:${formatDate(event.end, true)}`
      : `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.courseName) {
    lines.push(`CATEGORIES:${event.courseName}`);
  }

  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

// Generate complete iCal file content
export function generateICalFeed(events: CalendarEvent[], calendarName: string = "MedicForge"): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedicForge//Calendar//EN",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  const footer = "END:VCALENDAR";

  const eventsStr = events.map(generateICalEvent).join("\r\n");

  return `${header}\r\n${eventsStr}\r\n${footer}`;
}

// Generate Google Calendar URL for a single event
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatDate(event.start)}/${formatDate(event.end)}`,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook/Office 365 calendar URL
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatDate(event.start),
    enddt: formatDate(event.end),
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Hook for calendar sync functionality
export function useCalendarSync() {
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  // Fetch all upcoming events for the user
  const fetchUpcomingEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    if (!profile?.id || !profile?.tenant_id) return [];

    setIsLoading(true);
    const events: CalendarEvent[] = [];
    const now = new Date();

    try {
      // Fetch assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("course_id")
        .eq("student_id", profile.id)
        .eq("status", "active");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseIds = enrollments?.map((e: any) => e.course_id) || [];

      if (courseIds.length > 0) {
        // Fetch assignments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase as any)
          .from("assignments")
          .select(`
            id, title, description, due_date,
            module:modules(course:courses(id, title))
          `)
          .in("module.course_id", courseIds)
          .gte("due_date", now.toISOString())
          .eq("is_published", true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignments?.forEach((a: any) => {
          if (a.due_date) {
            const dueDate = new Date(a.due_date);
            events.push({
              id: `assignment-${a.id}`,
              title: `Due: ${a.title}`,
              description: a.description,
              start: dueDate,
              end: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour
              type: "assignment",
              courseId: a.module?.course?.id,
              courseName: a.module?.course?.title,
            });
          }
        });
      }

      // Fetch clinical shifts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: shifts } = await (supabase as any)
        .from("clinical_shift_bookings")
        .select(`
          id,
          shift:clinical_shifts(
            id, title, shift_date, start_time, end_time,
            site:clinical_sites(name, address)
          )
        `)
        .eq("student_id", profile.id)
        .eq("status", "booked");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shifts?.forEach((booking: any) => {
        const shift = booking.shift;
        if (shift) {
          const startDateTime = new Date(`${shift.shift_date}T${shift.start_time}`);
          const endDateTime = new Date(`${shift.shift_date}T${shift.end_time}`);

          events.push({
            id: `shift-${booking.id}`,
            title: `Clinical: ${shift.title}`,
            description: `Location: ${shift.site?.name || "TBD"}`,
            start: startDateTime,
            end: endDateTime,
            location: shift.site?.address,
            type: "clinical",
          });
        }
      });

      // Fetch attendance sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions } = await (supabase as any)
        .from("attendance_sessions")
        .select(`
          id, title, session_type, scheduled_date, start_time, end_time, location,
          course:courses(id, title)
        `)
        .in("course_id", courseIds)
        .gte("scheduled_date", now.toISOString().split("T")[0]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessions?.forEach((session: any) => {
        const startDateTime = new Date(`${session.scheduled_date}T${session.start_time}`);
        const endDateTime = new Date(`${session.scheduled_date}T${session.end_time}`);

        events.push({
          id: `session-${session.id}`,
          title: session.title,
          description: `${session.session_type} - ${session.course?.title}`,
          start: startDateTime,
          end: endDateTime,
          location: session.location,
          type: session.session_type === "exam" ? "exam" : "class",
          courseId: session.course?.id,
          courseName: session.course?.title,
        });
      });

    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setIsLoading(false);
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [profile?.id, profile?.tenant_id, supabase]);

  // Download iCal file
  const downloadICalFile = async (events?: CalendarEvent[]) => {
    try {
      const allEvents = events || await fetchUpcomingEvents();
      const icalContent = generateICalFeed(allEvents, "MedicForge Calendar");

      const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "medicforge-calendar.ics";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Calendar file downloaded");
    } catch (_err) {
      toast.error("Failed to download calendar");
    }
  };

  // Copy iCal subscription URL
  const copySubscriptionUrl = async () => {
    if (!profile?.id) {
      toast.error("You must be logged in");
      return;
    }

    // In production, this would be a server-generated URL
    const subscriptionUrl = `${window.location.origin}/api/calendar/${profile.id}/feed.ics`;

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      toast.success("Subscription URL copied to clipboard");
    } catch (_err) {
      toast.error("Failed to copy URL");
    }
  };

  // Add single event to Google Calendar
  const addToGoogleCalendar = (event: CalendarEvent) => {
    const url = generateGoogleCalendarUrl(event);
    window.open(url, "_blank");
  };

  // Add single event to Outlook
  const addToOutlookCalendar = (event: CalendarEvent) => {
    const url = generateOutlookCalendarUrl(event);
    window.open(url, "_blank");
  };

  // Download single event as iCal
  const downloadSingleEvent = (event: CalendarEvent) => {
    const icalContent = generateICalFeed([event], event.title);
    const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    isLoading,
    fetchUpcomingEvents,
    downloadICalFile,
    copySubscriptionUrl,
    addToGoogleCalendar,
    addToOutlookCalendar,
    downloadSingleEvent,
  };
}

// Component props for calendar sync button
export interface CalendarSyncButtonProps {
  event?: CalendarEvent;
  onSelect?: (type: "google" | "outlook" | "ical") => void;
}

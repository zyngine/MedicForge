"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import {
  CalendarEvent,
  generateICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from "@/lib/calendar-utils";

interface _AssignmentEvent {
  id: string;
  title: string;
  due_date: string;
  type: string;
  course: {
    title: string;
  } | null;
}

interface ShiftEvent {
  id: string;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  site: {
    name: string;
    address: string | null;
  } | null;
}

interface ClassEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  event_type: string;
}

// Fetch user's assignments for calendar
export function useAssignmentCalendar(courseId?: string) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["calendar-assignments", tenant?.id, user?.id, courseId],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();

      // Get enrolled course IDs first
      let enrollmentQuery = supabase
        .from("enrollments")
        .select("course_id")
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (courseId) {
        enrollmentQuery = enrollmentQuery.eq("course_id", courseId);
      }

      const { data: enrollments, error: enrollError } = await enrollmentQuery;
      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];
      if (courseIds.length === 0) return [];

      // Fetch assignments through modules
      const { data: assignments, error } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          due_date,
          type,
          is_published,
          module:modules!inner(
            course:courses!inner(id, title)
          )
        `)
        .not("due_date", "is", null)
        .eq("is_published", true);

      if (error) throw error;

      // Flatten assignments into calendar events
      const events: CalendarEvent[] = [];

      for (const assignment of assignments || []) {
        const courseModule = assignment.module as { course: { id: string; title: string } } | null;
        if (!courseModule?.course || !courseIds.includes(courseModule.course.id)) continue;
        if (!assignment.due_date) continue;

        const dueDate = new Date(assignment.due_date);

        events.push({
          id: assignment.id,
          title: `Due: ${assignment.title}`,
          description: `${assignment.type || "Assignment"} for ${courseModule.course.title}`,
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour after due date
          url: `/student/courses/${courseModule.course.id}/assignments/${assignment.id}`,
        });
      }

      return events;
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Fetch user's clinical shifts for calendar
export function useShiftCalendar() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["calendar-shifts", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      const { data, error } = await supabase
        .from("clinical_shift_bookings")
        .select(`
          id,
          shift:clinical_shifts(
            id,
            title,
            shift_date,
            start_time,
            end_time,
            site:clinical_sites(
              name,
              address
            )
          )
        `)
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .in("status", ["booked", "completed"]);

      if (error) throw error;

      const events: CalendarEvent[] = [];

      for (const booking of data || []) {
        const shift = booking.shift as ShiftEvent | null;
        if (!shift) continue;

        const startDateTime = new Date(`${shift.shift_date}T${shift.start_time}`);
        const endDateTime = new Date(`${shift.shift_date}T${shift.end_time}`);

        events.push({
          id: booking.id,
          title: shift.title || "Clinical Shift",
          description: shift.site?.name ? `Clinical shift at ${shift.site.name}` : "Clinical shift",
          location: shift.site?.address || undefined,
          start: startDateTime,
          end: endDateTime,
          url: "/student/clinical/my-shifts",
        });
      }

      return events;
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Fetch class events for calendar
export function useClassCalendar(courseId?: string) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["calendar-events", tenant?.id, user?.id, courseId],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();

      // Get enrolled courses first
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      const courseIds = courseId
        ? [courseId]
        : (enrollments?.map((e) => e.course_id) || []);

      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("tenant_id", tenant.id)
        .in("course_id", courseIds)
        .gte("start_time", new Date().toISOString());

      if (error) throw error;

      const events: CalendarEvent[] = [];

      for (const event of (data || []) as ClassEvent[]) {
        events.push({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
        });
      }

      return events;
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Combined hook for all calendar events
export function useCalendarExport(options?: { courseId?: string }) {
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useAssignmentCalendar(options?.courseId);
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCalendar();
  const { data: classes = [], isLoading: classesLoading } = useClassCalendar(
    options?.courseId
  );

  const allEvents = [...assignments, ...shifts, ...classes];
  const isLoading = assignmentsLoading || shiftsLoading || classesLoading;

  const exportToICS = (filename?: string) => {
    downloadICS(allEvents, filename || "medicforge-calendar.ics");
  };

  const getICSContent = () => {
    return generateICS(allEvents);
  };

  const getGoogleCalendarUrl = (event: CalendarEvent) => {
    return generateGoogleCalendarUrl(event);
  };

  const getOutlookCalendarUrl = (event: CalendarEvent) => {
    return generateOutlookCalendarUrl(event);
  };

  return {
    events: allEvents,
    assignments,
    shifts,
    classes,
    isLoading,
    exportToICS,
    getICSContent,
    getGoogleCalendarUrl,
    getOutlookCalendarUrl,
  };
}

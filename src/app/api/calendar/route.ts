import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateICS, CalendarEvent } from "@/lib/calendar-utils";

/**
 * GET /api/calendar
 * Returns ICS file for calendar subscription
 * Query params:
 * - token: User's calendar token for authentication
 * - type: "all" | "assignments" | "shifts" | "events" (default: "all")
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type") || "all";

  if (!token) {
    return NextResponse.json(
      { error: "Calendar token required" },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  // Look up the calendar token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: calendarToken, error: tokenError } = await (supabase as any)
    .from("calendar_tokens")
    .select("user_id, tenant_id, is_active")
    .eq("token", token)
    .single();

  if (tokenError || !calendarToken || !calendarToken.is_active) {
    return NextResponse.json(
      { error: "Invalid or expired calendar token" },
      { status: 401 }
    );
  }

  const { user_id: userId, tenant_id: tenantId } = calendarToken;
  const events: CalendarEvent[] = [];

  // Fetch assignments if requested
  if (type === "all" || type === "assignments") {
    // Get enrolled course IDs first
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("tenant_id", tenantId)
      .eq("student_id", userId)
      .eq("status", "active");

    const courseIds = enrollments?.map(e => e.course_id) || [];

    if (courseIds.length > 0) {
      // Fetch assignments through modules
      const { data: assignments } = await supabase
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

      for (const assignment of assignments || []) {
        const module = assignment.module as { course: { id: string; title: string } } | null;
        if (!module?.course || !courseIds.includes(module.course.id)) continue;
        if (!assignment.due_date) continue;

        const dueDate = new Date(assignment.due_date);
        events.push({
          id: assignment.id,
          title: `Due: ${assignment.title}`,
          description: `${assignment.type || "Assignment"} for ${module.course.title}`,
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000),
        });
      }
    }
  }

  // Fetch clinical shifts if requested
  if (type === "all" || type === "shifts") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookings } = await (supabase as any)
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
      .eq("tenant_id", tenantId)
      .eq("student_id", userId)
      .in("status", ["booked", "completed"]);

    for (const booking of bookings || []) {
      const shift = booking.shift as { id: string; title: string; shift_date: string; start_time: string; end_time: string; site: { name: string; address: string | null } | null } | null;
      if (!shift) continue;

      const startDateTime = new Date(`${shift.shift_date}T${shift.start_time}`);
      const endDateTime = new Date(`${shift.shift_date}T${shift.end_time}`);

      events.push({
        id: booking.id,
        title: shift.title || "Clinical Shift",
        description: shift.site?.name ? `Clinical shift at ${shift.site.name}` : undefined,
        location: shift.site?.address || undefined,
        start: startDateTime,
        end: endDateTime,
      });
    }
  }

  // Fetch class events if requested
  if (type === "all" || type === "events") {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("tenant_id", tenantId)
      .eq("student_id", userId)
      .eq("status", "active");

    const courseIds = enrollments?.map((e) => e.course_id) || [];

    if (courseIds.length > 0) {
      const { data: classEvents } = await supabase
        .from("events")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("course_id", courseIds)
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      for (const event of classEvents || []) {
        events.push({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
        });
      }
    }
  }

  // Generate ICS content
  const icsContent = generateICS(events, "MedicForge Calendar");

  // Return as downloadable ICS file
  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="medicforge-calendar.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

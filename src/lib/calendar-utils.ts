/**
 * Calendar utilities for generating ICS files and calendar links
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  url?: string;
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval?: number;
    count?: number;
    until?: Date;
  };
}

/**
 * Generate an ICS (iCalendar) file content from events
 */
export function generateICS(events: CalendarEvent[], calendarName = "MedicForge"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedicForge//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
  ];

  for (const event of events) {
    lines.push(...generateVEvent(event));
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Generate a single VEVENT block
 */
function generateVEvent(event: CalendarEvent): string[] {
  const uid = `${event.id}@medicforge.com`;
  const dtstamp = formatICSDate(new Date());

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICSDateOnly(event.start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICSDateOnly(event.end)}`);
  } else {
    lines.push(`DTSTART:${formatICSDate(event.start)}`);
    lines.push(`DTEND:${formatICSDate(event.end)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.recurrence) {
    lines.push(generateRRule(event.recurrence));
  }

  lines.push("END:VEVENT");

  return lines;
}

/**
 * Generate RRULE for recurring events
 */
function generateRRule(recurrence: CalendarEvent["recurrence"]): string {
  if (!recurrence) return "";

  const parts: string[] = [`FREQ=${recurrence.frequency.toUpperCase()}`];

  if (recurrence.interval && recurrence.interval > 1) {
    parts.push(`INTERVAL=${recurrence.interval}`);
  }

  if (recurrence.count) {
    parts.push(`COUNT=${recurrence.count}`);
  } else if (recurrence.until) {
    parts.push(`UNTIL=${formatICSDate(recurrence.until)}`);
  }

  return `RRULE:${parts.join(";")}`;
}

/**
 * Format date for ICS (UTC format)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Format date-only for all-day events
 */
function formatICSDateOnly(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

/**
 * Escape text for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate Google Calendar URL for a single event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format date for Google Calendar URL
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generate Outlook Calendar URL (web version)
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Download an ICS file
 */
export function downloadICS(events: CalendarEvent[], filename = "calendar.ics"): void {
  const content = generateICS(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy calendar subscription URL to clipboard
 */
export async function copyCalendarUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

"use client";

import { format, addHours } from "date-fns";

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  url?: string;
}

// Generate ICS file content
export function generateICS(event: CalendarEvent): string {
  const now = new Date();
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@medicforge.net`;

  const formatICSDate = (date: Date, allDay = false): string => {
    if (allDay) {
      return format(date, "yyyyMMdd");
    }
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const startDate = formatICSDate(event.start, event.allDay);
  const endDate = formatICSDate(event.end || addHours(event.start, 1), event.allDay);

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedicForge//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART${event.allDay ? ";VALUE=DATE" : ""}:${startDate}`,
    `DTEND${event.allDay ? ";VALUE=DATE" : ""}:${endDate}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    ics.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    ics.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.url) {
    ics.push(`URL:${event.url}`);
  }

  ics.push("END:VEVENT", "END:VCALENDAR");

  return ics.join("\r\n");
}

// Generate ICS for multiple events
export function generateICSBatch(events: CalendarEvent[]): string {
  const now = new Date();

  const formatICSDate = (date: Date, allDay = false): string => {
    if (allDay) {
      return format(date, "yyyyMMdd");
    }
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedicForge//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event, index) => {
    const uid = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}@medicforge.net`;
    const startDate = formatICSDate(event.start, event.allDay);
    const endDate = formatICSDate(event.end || addHours(event.start, 1), event.allDay);

    ics.push("BEGIN:VEVENT");
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${formatICSDate(now)}`);
    ics.push(`DTSTART${event.allDay ? ";VALUE=DATE" : ""}:${startDate}`);
    ics.push(`DTEND${event.allDay ? ";VALUE=DATE" : ""}:${endDate}`);
    ics.push(`SUMMARY:${escapeText(event.title)}`);

    if (event.description) {
      ics.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    if (event.location) {
      ics.push(`LOCATION:${escapeText(event.location)}`);
    }

    if (event.url) {
      ics.push(`URL:${event.url}`);
    }

    ics.push("END:VEVENT");
  });

  ics.push("END:VCALENDAR");

  return ics.join("\r\n");
}

// Download ICS file
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download multiple events as ICS
export function downloadICSBatch(events: CalendarEvent[], filename = "events.ics"): void {
  const icsContent = generateICSBatch(events);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Google Calendar URL
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end || addHours(event.start, 1))}`,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook Calendar URL
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: formatOutlookDate(event.start),
    enddt: formatOutlookDate(event.end || addHours(event.start, 1)),
    subject: event.title,
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Generate Yahoo Calendar URL
export function getYahooCalendarUrl(event: CalendarEvent): string {
  const formatYahooDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const duration = event.end
    ? Math.round((event.end.getTime() - event.start.getTime()) / 60000)
    : 60;

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const dur = `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`;

  const params = new URLSearchParams({
    v: "60",
    title: event.title,
    st: formatYahooDate(event.start),
    dur,
  });

  if (event.description) {
    params.set("desc", event.description);
  }

  if (event.location) {
    params.set("in_loc", event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

// Calendar links component data
export function getCalendarLinks(event: CalendarEvent) {
  return {
    google: getGoogleCalendarUrl(event),
    outlook: getOutlookCalendarUrl(event),
    yahoo: getYahooCalendarUrl(event),
    downloadICS: () => downloadICS(event),
  };
}

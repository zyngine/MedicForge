"use client";

import { useState } from "react";
import { useCalendarSubscription } from "@/lib/hooks/use-calendar-subscription";
import { useShiftBookings } from "@/lib/hooks/use-shift-bookings";
import { useUser } from "@/lib/hooks/use-user";
import { downloadICS, type CalendarEvent } from "@/lib/calendar-utils";

type Platform = "ios" | "android" | "google" | "outlook";

const PLATFORM_INSTRUCTIONS: Record<Platform, { label: string; steps: string[] }> = {
  ios: {
    label: "iPhone / iPad",
    steps: [
      'Tap "Copy Subscribe URL" below.',
      "Open the Settings app on your iPhone or iPad.",
      'Scroll down and tap "Calendar".',
      'Tap "Accounts" → "Add Account" → "Other".',
      'Tap "Add Subscribed Calendar".',
      "Paste the URL and tap Next.",
      "Tap Save — shifts will sync automatically.",
    ],
  },
  android: {
    label: "Android",
    steps: [
      'Tap "Copy Subscribe URL" below.',
      "Open Google Calendar on your Android device.",
      "Tap the three-line menu → Other calendars → + (Add).",
      'Select "From URL".',
      "Paste the URL and tap Add Calendar.",
      "Shifts will appear and stay in sync.",
    ],
  },
  google: {
    label: "Google Calendar",
    steps: [
      'Tap "Copy Subscribe URL" below.',
      "Go to calendar.google.com in a browser.",
      'Click "Other calendars" (left sidebar) → "+" → "From URL".',
      "Paste the URL and click Add Calendar.",
      "Your clinical shifts will sync every few hours.",
    ],
  },
  outlook: {
    label: "Outlook",
    steps: [
      'Tap "Copy Subscribe URL" below.',
      "Open Outlook (desktop or web).",
      "Go to Calendar → Add Calendar → Subscribe from web.",
      "Paste the URL and click Import.",
      "Shifts will appear in your Outlook calendar.",
    ],
  },
};

export function CalendarExport() {
  const { profile } = useUser();
  const { bookings } = useShiftBookings({ studentId: profile?.id || undefined });
  const { subscription, isLoading } = useCalendarSubscription();
  const [activePlatform, setActivePlatform] = useState<Platform>("ios");
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const today = new Date().toISOString().split("T")[0];
    const events: CalendarEvent[] = bookings
      .filter(
        (b) =>
          ["booked", "poc_approved"].includes(b.status) &&
          b.shift?.shift_date &&
          b.shift.shift_date >= today
      )
      .map((b) => {
        const shift = b.shift!;
        const site = shift.site;
        const dateStr = shift.shift_date;
        const [startH, startM] = (shift.start_time || "00:00").split(":");
        const [endH, endM] = (shift.end_time || "01:00").split(":");
        const start = new Date(`${dateStr}T${startH.padStart(2, "0")}:${startM.padStart(2, "0")}:00`);
        const end = new Date(`${dateStr}T${endH.padStart(2, "0")}:${endM.padStart(2, "0")}:00`);
        const location = site
          ? [site.address, site.city, site.state].filter(Boolean).join(", ")
          : undefined;

        return {
          id: b.id,
          title: `Clinical: ${shift.title || site?.name || "Shift"}`,
          location: location || undefined,
          start,
          end,
        };
      });

    if (events.length === 0) {
      alert("No upcoming approved shifts to export.");
      return;
    }

    downloadICS(events, "clinical-shifts.ics");
  };

  const handleCopy = async () => {
    if (!subscription) return;
    try {
      await navigator.clipboard.writeText(subscription.webcalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = subscription.webcalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWebcalOpen = () => {
    if (!subscription) return;
    window.location.href = subscription.webcalUrl;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-card-foreground">Export Clinical Schedule</h2>

      {/* Download ICS */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">One-time Download</h3>
        <p className="text-sm text-muted-foreground">
          Download a snapshot of your upcoming approved shifts as a .ics file.
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Download .ics File
        </button>
      </div>

      <hr className="border-border" />

      {/* Subscribe */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Subscribe to Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Subscribe once and your calendar app will automatically update whenever shifts are added or approved.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading subscription URL...</p>
        ) : subscription ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                {copied ? "Copied!" : "Copy Subscribe URL"}
              </button>
              <button
                onClick={handleWebcalOpen}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Open in Calendar App
              </button>
            </div>

            {/* Platform tabs */}
            <div>
              <div className="flex gap-1 border-b border-border mb-3">
                {(Object.keys(PLATFORM_INSTRUCTIONS) as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activePlatform === p
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PLATFORM_INSTRUCTIONS[p].label}
                  </button>
                ))}
              </div>
              <ol className="list-decimal list-inside space-y-1.5">
                {PLATFORM_INSTRUCTIONS[activePlatform].steps.map((step, i) => (
                  <li key={i} className="text-sm text-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive">Could not load subscription URL. Please try again.</p>
        )}
      </div>
    </div>
  );
}

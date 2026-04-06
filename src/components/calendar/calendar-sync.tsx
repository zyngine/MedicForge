"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  Calendar,
  Download,
  ExternalLink,
  Copy,
  ChevronDown,
} from "lucide-react";
import {
  useCalendarSync,
  CalendarEvent,
} from "@/lib/hooks/use-calendar-sync";

interface CalendarSyncDropdownProps {
  event?: CalendarEvent;
  className?: string;
}

export function CalendarSyncDropdown({ event, className }: CalendarSyncDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    downloadSingleEvent,
    addToGoogleCalendar,
    addToOutlookCalendar,
    downloadICalFile,
    copySubscriptionUrl,
  } = useCalendarSync();

  const handleOption = (option: string) => {
    setIsOpen(false);

    if (event) {
      switch (option) {
        case "google":
          addToGoogleCalendar(event);
          break;
        case "outlook":
          addToOutlookCalendar(event);
          break;
        case "ical":
          downloadSingleEvent(event);
          break;
      }
    } else {
      switch (option) {
        case "google":
        case "outlook":
        case "ical":
          downloadICalFile();
          break;
        case "subscribe":
          copySubscriptionUrl();
          break;
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-1">
              <button
                onClick={() => handleOption("google")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google Calendar
                <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />
              </button>

              <button
                onClick={() => handleOption("outlook")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    fill="#0078D4"
                    d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.587.234h-8.653v-6.18l1.37 1.015c.088.063.187.095.298.095.11 0 .21-.032.298-.095l6.27-4.643V7.213a.252.252 0 01.044.053.252.252 0 01-.044.053l-6.568 4.866-2.34-1.736V6.576h8.563c.23 0 .424.077.582.23a.76.76 0 01.238.58h.767zm-9.478 4.53v5.558H5.737V3.778h8.785v8.14zm-8.785 8.305h8.785v-2.17H5.737v2.17zM14.523.823H4.87a.87.87 0 00-.87.87V22.31c0 .48.39.87.87.87h9.653V.823z"
                  />
                </svg>
                Outlook Calendar
                <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />
              </button>

              <button
                onClick={() => handleOption("ical")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                Apple Calendar (iCal)
                <Download className="h-3 w-3 ml-auto text-gray-400" />
              </button>

              {!event && (
                <>
                  <div className="border-t my-1" />
                  <button
                    onClick={() => handleOption("subscribe")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    <Copy className="h-4 w-4 text-gray-600" />
                    Copy subscription URL
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Full calendar sync settings component
export function CalendarSyncSettings() {
  const {
    isLoading: _isLoading,
    fetchUpcomingEvents,
    downloadICalFile,
    copySubscriptionUrl,
  } = useCalendarSync();
  const [eventCount, setEventCount] = useState<number | null>(null);

  const _handleRefresh = async () => {
    const events = await fetchUpcomingEvents();
    setEventCount(events.length);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Calendar Sync</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Sync your MedicForge assignments, clinical shifts, and class schedules with your preferred calendar app.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium">Google Calendar</p>
              <p className="text-sm text-muted-foreground">Add events directly to Google Calendar</p>
            </div>
          </div>
          <CalendarSyncDropdown />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">Apple Calendar / iCal</p>
              <p className="text-sm text-muted-foreground">Download .ics file for any calendar app</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadICalFile()}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Calendar Subscription</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Subscribe to your calendar feed to automatically receive updates when new events are added.
          </p>
          <Button variant="outline" size="sm" onClick={copySubscriptionUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Subscription URL
          </Button>
        </div>

        {eventCount !== null && (
          <p className="text-sm text-muted-foreground">
            {eventCount} upcoming events found
          </p>
        )}
      </div>
    </Card>
  );
}

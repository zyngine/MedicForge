"use client";

import { useState } from "react";
import { Calendar, Download, Link2, Copy, Check, Loader2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { useCalendarExport } from "@/lib/hooks/use-calendar-export";
import { useCalendarTokens } from "@/lib/hooks/use-calendar-tokens";

export function CalendarSync() {
  const {
    events,
    isLoading: eventsLoading,
    exportToICS,
    getGoogleCalendarUrl,
    getOutlookCalendarUrl,
  } = useCalendarExport();

  const {
    tokens,
    isLoading: tokensLoading,
    createToken,
    revokeToken,
    isCreating,
  } = useCalendarTokens();

  const [copied, setCopied] = useState(false);
  const [_selectedEvent, _setSelectedEvent] = useState<number | null>(null);

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getSubscriptionUrl = (token: string) => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/calendar?token=${token}`;
  };

  const getWebcalUrl = (token: string) => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin.replace(/^https?:\/\//, "");
    return `webcal://${baseUrl}/api/calendar?token=${token}`;
  };

  const isLoading = eventsLoading || tokensLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Calendar
          </CardTitle>
          <CardDescription>
            Download your schedule as an ICS file to import into any calendar app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{events.length} upcoming events</p>
              <p className="text-sm text-muted-foreground">
                Includes assignments, clinical shifts, and class events
              </p>
            </div>
            <Button onClick={() => exportToICS()} disabled={events.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download .ICS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Calendar Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to your calendar for automatic updates in Google Calendar, Apple Calendar, or Outlook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokens && tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(token.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeToken(token.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Subscription URL</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={getSubscriptionUrl(token.token)}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyUrl(getSubscriptionUrl(token.token))}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={getWebcalUrl(token.token)} target="_blank">
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(getWebcalUrl(token.token))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Calendar
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No calendar subscriptions yet. Create one to sync your schedule automatically.
              </p>
            </div>
          )}

          <Button
            onClick={() => createToken("My Calendar")}
            disabled={isCreating}
            variant={tokens && tokens.length > 0 ? "outline" : "default"}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Create Subscription URL
          </Button>
        </CardContent>
      </Card>

      {/* Quick Add Buttons */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add Individual Events
            </CardTitle>
            <CardDescription>
              Add specific events to your calendar one at a time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(0, 10).map((event, _index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.start.toLocaleDateString()} at{" "}
                      {event.start.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={getGoogleCalendarUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M19.5 3h-15A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"
                          />
                        </svg>
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={getOutlookCalendarUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Outlook"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H8.21q-.48 0-.8-.33-.33-.32-.33-.8V18H1.13q-.46 0-.8-.33Q0 17.35 0 16.88V7.13q0-.47.33-.8.34-.33.8-.33h6.94V3.63q0-.47.33-.8.32-.33.8-.33h15.67q.47 0 .8.33.33.33.33.8V12zm-6 0V7.13q0-.47.33-.8.33-.33.8-.33h3.51V3.63H8.21v16.75h15.43V12z"
                          />
                        </svg>
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {events.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                And {events.length - 10} more events...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

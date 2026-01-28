"use client";

import {
  Card,
  CardContent,
  Button,
  Badge,
} from "@/components/ui";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Users,
  Play,
} from "lucide-react";
import { useVideoSessions } from "@/lib/hooks/use-video-sessions";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";

export default function StudentVideoSessionsPage() {
  const { sessions, isLoading, error } = useVideoSessions({ upcoming: true });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusBadge = (session: typeof sessions[0]) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    if (session.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (session.status === "completed" || isPast(end)) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (now >= start && now <= end) {
      return <Badge variant="default" className="bg-green-600 animate-pulse">Live Now</Badge>;
    }
    return <Badge variant="outline">Upcoming</Badge>;
  };

  const isSessionLive = (session: typeof sessions[0]) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);
    return now >= start && now <= end;
  };

  // Sort sessions: live first, then by start time
  const sortedSessions = [...sessions].sort((a, b) => {
    const aLive = isSessionLive(a);
    const bLive = isSessionLive(b);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Video Sessions</h1>
        <p className="text-muted-foreground">
          Join live video classes and view upcoming sessions
        </p>
      </div>

      {/* Live Sessions Alert */}
      {sortedSessions.some(isSessionLive) && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <div className="relative">
                <Video className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="font-medium">You have a live session right now!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming Sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sessions.filter(isSessionLive).length}
              </p>
              <p className="text-xs text-muted-foreground">Live Now</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sessions.filter(s => {
                  const start = new Date(s.scheduled_start);
                  const now = new Date();
                  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                  return start >= now && start <= tomorrow;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Today/Tomorrow</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      {sortedSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
            <p className="text-muted-foreground">
              Your instructors haven&apos;t scheduled any video sessions yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedSessions.map((session) => {
            const startDate = new Date(session.scheduled_start);
            const endDate = new Date(session.scheduled_end);
            const isLive = isSessionLive(session);
            const joinUrl = session.join_url || session.manual_link;

            return (
              <Card key={session.id} className={isLive ? "border-green-500 border-2" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isLive ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                        {isLive ? (
                          <div className="relative">
                            <Video className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-ping" />
                          </div>
                        ) : (
                          <Video className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.title}</p>
                          {getStatusBadge(session)}
                        </div>
                        {session.course && (
                          <p className="text-sm text-primary">{session.course.title}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(startDate, "EEEE, MMM d")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                          </span>
                        </div>
                        {!isLive && isFuture(startDate) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Starts {formatDistanceToNow(startDate, { addSuffix: true })}
                          </p>
                        )}
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.creator && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-muted-foreground">Hosted by</p>
                          <p className="text-sm font-medium">{session.creator.full_name}</p>
                        </div>
                      )}
                      {joinUrl && (
                        <Button
                          variant={isLive ? "default" : "outline"}
                          size={isLive ? "default" : "sm"}
                          asChild
                          className={isLive ? "animate-pulse" : ""}
                        >
                          <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                            {isLive ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Join Now
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Join Link
                              </>
                            )}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Password hint if available */}
                  {session.password && isLive && (
                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <span className="text-muted-foreground">Meeting Password: </span>
                      <span className="font-mono">{session.password}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recording Section - for completed sessions with recordings */}
      {sessions.some(s => s.is_recording_available) && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recordings</h2>
          <div className="space-y-4">
            {sessions
              .filter(s => s.is_recording_available && s.recording_url)
              .map((session) => (
                <Card key={`recording-${session.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <Video className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{session.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.scheduled_start), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={session.recording_url!} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4 mr-1" />
                        Watch Recording
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

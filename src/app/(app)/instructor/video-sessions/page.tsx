"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Modal,
  Input,
  Label,
  Textarea,
  Select,
  Alert,
} from "@/components/ui";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Play,
  Settings,
  Loader2,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { useVideoSessions, useZoomConnection } from "@/lib/hooks/use-video-sessions";
import { useCourses } from "@/lib/hooks/use-courses";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";

const SESSION_TYPES = [
  { value: "class", label: "Class Session" },
  { value: "office_hours", label: "Office Hours" },
  { value: "tutoring", label: "Tutoring" },
  { value: "meeting", label: "Meeting" },
];

export default function VideoSessionsPage() {
  const { sessions, isLoading, error, createSession, deleteSession, refetch } = useVideoSessions({ upcoming: true });
  const { isConnected, zoomEmail, isLoading: zoomLoading, connectUrl, disconnect } = useZoomConnection();
  const { data: courses = [] } = useCourses();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    sessionType: "class",
    date: "",
    startTime: "",
    endTime: "",
    useZoom: true,
    manualLink: "",
  });

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
        setFormError("Please fill in all required fields");
        return;
      }

      const scheduledStart = new Date(`${formData.date}T${formData.startTime}`);
      const scheduledEnd = new Date(`${formData.date}T${formData.endTime}`);

      if (scheduledEnd <= scheduledStart) {
        setFormError("End time must be after start time");
        return;
      }

      const result = await createSession({
        title: formData.title,
        description: formData.description || undefined,
        courseId: formData.courseId || undefined,
        sessionType: formData.sessionType,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        useZoom: formData.useZoom,
        manualLink: !formData.useZoom ? formData.manualLink : undefined,
        videoPlatform: !formData.useZoom ? "other" : "zoom",
      });

      if (result) {
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          courseId: "",
          sessionType: "class",
          date: "",
          startTime: "",
          endTime: "",
          useZoom: true,
          manualLink: "",
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this video session?")) {
      await deleteSession(sessionId);
    }
  };

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
      return <Badge variant="default" className="bg-green-600">Live Now</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  if (isLoading || zoomLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Sessions</h1>
          <p className="text-muted-foreground">
            Schedule and manage video classes for your students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Zoom Settings
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
        </div>
      </div>

      {/* Zoom Connection Status */}
      {!isConnected && (
        <Alert variant="warning">
          <Video className="h-4 w-4" />
          <div className="ml-2">
            <p className="font-medium">Zoom Not Connected</p>
            <p className="text-sm">
              Connect your Zoom account to automatically create meeting links.{" "}
              <a href={connectUrl} className="underline">
                Connect Zoom
              </a>
            </p>
          </div>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                {sessions.filter(s => {
                  const now = new Date();
                  const start = new Date(s.scheduled_start);
                  const end = new Date(s.scheduled_end);
                  return now >= start && now <= end;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Live Now</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sessions.filter(s => s.video_platform === "zoom").length}
              </p>
              <p className="text-xs text-muted-foreground">Zoom Meetings</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
              {isConnected ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-medium">{isConnected ? "Connected" : "Not Connected"}</p>
              <p className="text-xs text-muted-foreground">Zoom Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your first video class to get started.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const startDate = new Date(session.scheduled_start);
            const endDate = new Date(session.scheduled_end);
            const isLive = new Date() >= startDate && new Date() <= endDate;

            return (
              <Card key={session.id} className={isLive ? "border-green-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isLive ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.title}</p>
                          {getStatusBadge(session)}
                          {session.course && (
                            <Badge variant="outline">{session.course.title}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(startDate, "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                          </span>
                          {isFuture(startDate) && (
                            <span className="text-xs">
                              Starts {formatDistanceToNow(startDate, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.start_url && (
                        <Button variant="default" size="sm" asChild>
                          <a href={session.start_url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-1" />
                            Start Meeting
                          </a>
                        </Button>
                      )}
                      {session.join_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={session.join_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Join Link
                          </a>
                        </Button>
                      )}
                      {session.manual_link && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={session.manual_link} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="h-4 w-4 mr-1" />
                            Join
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Video Session"
        size="lg"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          {formError && (
            <Alert variant="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" required>Session Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Week 3 - Airway Management"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <Select
                options={SESSION_TYPES}
                value={formData.sessionType}
                onChange={(value) => setFormData({ ...formData, sessionType: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course (Optional)</Label>
              <Select
                options={[
                  { value: "", label: "No specific course" },
                  ...courses.map((c) => ({ value: c.id, label: c.title })),
                ]}
                value={formData.courseId}
                onChange={(value) => setFormData({ ...formData, courseId: value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will be covered in this session?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" required>Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime" required>Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime" required>End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useZoom"
                checked={formData.useZoom}
                onChange={(e) => setFormData({ ...formData, useZoom: e.target.checked })}
                className="rounded"
                disabled={!isConnected}
              />
              <Label htmlFor="useZoom" className="cursor-pointer">
                Create Zoom meeting automatically
              </Label>
            </div>

            {!isConnected && (
              <p className="text-xs text-muted-foreground">
                <a href={connectUrl} className="text-primary underline">
                  Connect your Zoom account
                </a>{" "}
                to enable automatic meeting creation.
              </p>
            )}

            {!formData.useZoom && (
              <div className="space-y-2">
                <Label htmlFor="manualLink">Video Meeting Link</Label>
                <Input
                  id="manualLink"
                  value={formData.manualLink}
                  onChange={(e) => setFormData({ ...formData, manualLink: e.target.value })}
                  placeholder="https://zoom.us/j/... or Google Meet link"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Session
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Zoom Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Zoom Settings"
        size="md"
      >
        <div className="space-y-4">
          {isConnected ? (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Zoom Connected</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Connected as: {zoomEmail}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Your Zoom account is connected. Meetings will be created automatically when you schedule video sessions.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (confirm("Disconnect your Zoom account?")) {
                    await disconnect();
                    setShowSettingsModal(false);
                  }
                }}
              >
                Disconnect Zoom
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-gray-50 border rounded-lg">
                <div className="flex items-center gap-2 text-gray-800">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Zoom Not Connected</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Connect your Zoom account to automatically create meetings.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                After connecting, MedicForge can create Zoom meetings on your behalf when you schedule video sessions.
              </p>

              <Button asChild className="w-full">
                <a href={connectUrl}>
                  <Video className="h-4 w-4 mr-2" />
                  Connect Zoom Account
                </a>
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

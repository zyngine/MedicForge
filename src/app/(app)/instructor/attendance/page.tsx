"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Select,
  Alert,
  Spinner,
  Modal,
} from "@/components/ui";
import {
  UserCheck,
  Clock,
  Copy,
  Check,
  X,
  Users,
  RefreshCw,
  Plus,
  History,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Play,
  MapPin,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { useTodaysSessions, formatTimeDisplay, getSessionTypeLabel } from "@/lib/hooks/use-program-schedules";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

interface AttendanceSession {
  id: string;
  title: string;
  course_id: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  tardy_window_minutes?: number;
  allow_late_checkin?: boolean;
  code?: {
    code: string;
    expires_at: string;
  } | null;
  _count?: { records: number };
  course?: { title: string } | null;
}

// Status badge variant mapping
const getStatusBadgeVariant = (status: string): "success" | "warning" | "destructive" | "info" | "secondary" => {
  switch (status) {
    case "present": return "success";
    case "late": return "warning";
    case "absent": return "destructive";
    case "excused": return "info";
    case "virtual": return "secondary";
    case "left_early": return "warning";
    default: return "secondary";
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "present": return "Present";
    case "late": return "Tardy";
    case "absent": return "Absent";
    case "excused": return "Excused";
    case "virtual": return "Virtual";
    case "left_early": return "Left Early";
    default: return status;
  }
};

// Generate a 4-digit code
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Hook to fetch recent attendance sessions
function useAttendanceSessionsWithCodes() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["instructor-attendance-sessions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();

      // Get recent sessions
      const { data: sessions, error } = await supabase
        .from("attendance_sessions")
        .select(`
          id, title, course_id, scheduled_date, start_time, end_time, created_at,
          course:courses(title)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get codes and counts for each session
      const sessionsWithDetails = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sessions || []).map(async (session: any) => {
          // Get check-in code
          const { data: codeData } = await supabase
            .from("attendance_check_in_codes")
            .select("code, expires_at")
            .eq("session_id", session.id)
            .single();

          // Get record count
          const { count } = await supabase
            .from("attendance_records")
            .select("id", { count: "exact", head: true })
            .eq("session_id", session.id);

          return {
            ...session,
            code: codeData,
            _count: { records: count || 0 },
          } as AttendanceSession;
        })
      );

      return sessionsWithDetails;
    },
    enabled: !!tenant?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Hook to start a new attendance session
function useStartAttendance() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      courseId?: string;
      durationMinutes: number;
      tardyWindowMinutes?: number;
      allowLateCheckin?: boolean;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();
      const now = new Date();
      const endTime = new Date(now.getTime() + params.durationMinutes * 60 * 1000);

      // Create session with tardy configuration
      const { data: session, error: sessionError } = await supabase
        .from("attendance_sessions")
        .insert({
          tenant_id: tenant.id,
          course_id: params.courseId || null,
          title: params.title,
          session_type: "lecture",
          scheduled_date: now.toISOString().split("T")[0],
          start_time: now.toTimeString().slice(0, 5),
          end_time: endTime.toTimeString().slice(0, 5),
          tardy_window_minutes: params.tardyWindowMinutes ?? 15,
          allow_late_checkin: params.allowLateCheckin ?? true,
          session_status: "in_progress",
          created_by: user.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Generate and save check-in code
      const code = generateCode();
      const { error: codeError } = await supabase
        .from("attendance_check_in_codes")
        .insert({
          session_id: session.id,
          tenant_id: tenant.id,
          code: code,
          expires_at: endTime.toISOString(),
          created_by: user.id,
        });

      if (codeError) throw codeError;

      return { ...session, code: { code, expires_at: endTime.toISOString() } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-attendance-sessions"] });
    },
  });
}

// Hook to end a session (delete the code)
function useEndAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = getDb();

      const { error } = await supabase
        .from("attendance_check_in_codes")
        .delete()
        .eq("session_id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-attendance-sessions"] });
    },
  });
}

// Hook to get check-ins for a session
function useSessionCheckIns(sessionId: string | null) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["session-checkins", sessionId],
    queryFn: async () => {
      if (!sessionId || !tenant?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          id, status, check_in_time, recorded_at, student_id, was_late
        `)
        .eq("session_id", sessionId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;

      // Fetch student info separately since FK is to auth.users, not public.users
      const studentIds = (data || []).map((r: any) => r.student_id);
      const { data: students } = studentIds.length > 0
        ? await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", studentIds)
        : { data: [] };

      // Map students to records
      const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
      return (data || []).map((record: any) => ({
        ...record,
        student: studentMap.get(record.student_id) || null,
      }));
    },
    enabled: !!sessionId && !!tenant?.id,
    refetchInterval: 5000, // Poll for new check-ins
  });
}

// Hook to update a student's attendance status
function useUpdateAttendanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, status }: { recordId: string; status: string }) => {
      const supabase = getDb();

      const { error } = await supabase
        .from("attendance_records")
        .update({
          status,
          was_late: status === "late",
        })
        .eq("id", recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-checkins"] });
    },
  });
}

export default function InstructorAttendancePage() {
  const { data: sessions = [], isLoading } = useAttendanceSessionsWithCodes();
  const { data: courses = [] } = useInstructorCourses();
  const { data: todaysSessions = [], isLoading: todaysLoading } = useTodaysSessions();
  const startMutation = useStartAttendance();
  const endMutation = useEndAttendance();

  const [showStartModal, setShowStartModal] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState<AttendanceSession | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("Class Attendance");
  const [courseId, setCourseId] = React.useState("");
  const [duration, setDuration] = React.useState("60");
  const [tardyWindow, setTardyWindow] = React.useState("15");
  const [allowLateCheckin, setAllowLateCheckin] = React.useState(true);

  // Find active session (has unexpired code)
  const activeSession = sessions.find(
    (s) => s.code && new Date(s.code.expires_at) > new Date()
  );

  const handleStartAttendance = async () => {
    try {
      await startMutation.mutateAsync({
        title,
        courseId: courseId || undefined,
        durationMinutes: parseInt(duration),
        tardyWindowMinutes: parseInt(tardyWindow),
        allowLateCheckin,
      });
      setShowStartModal(false);
      setTitle("Class Attendance");
      setCourseId("");
      setTardyWindow("15");
      setAllowLateCheckin(true);
    } catch (error) {
      console.error("Failed to start attendance:", error);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = async (sessionId: string) => {
    if (confirm("End this attendance session? Students won't be able to check in anymore.")) {
      await endMutation.mutateAsync(sessionId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Take attendance using check-in codes
          </p>
        </div>
        {!activeSession && (
          <Button onClick={() => setShowStartModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start Attendance
          </Button>
        )}
      </div>

      {/* Today's Scheduled Classes */}
      {!todaysLoading && todaysSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Today&apos;s Scheduled Classes
            </CardTitle>
            <CardDescription>
              Pre-scheduled sessions for today. Click &quot;Start&quot; to begin taking attendance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysSessions.map((ts: any) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{ts.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatTimeDisplay(ts.start_time)} - {formatTimeDisplay(ts.end_time)}</span>
                        {ts.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ts.location}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getSessionTypeLabel(ts.session_type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ts.program_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ts.has_active_code ? (
                      <Badge variant="success">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
                        In Progress ({ts.check_in_count} checked in)
                      </Badge>
                    ) : ts.session_status === "completed" ? (
                      <Badge variant="secondary">Completed ({ts.check_in_count})</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          // Pre-fill the start modal with session details
                          setTitle(ts.title);
                          setShowStartModal(true);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Attendance
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Session Card */}
      {activeSession && activeSession.code && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  Active Session
                </CardTitle>
                <CardDescription>{activeSession.title}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEndSession(activeSession.id)}
              >
                <X className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Code Display */}
              <div className="flex-1 text-center">
                <p className="text-sm text-muted-foreground mb-2">Check-in Code</p>
                <div className="font-mono text-6xl font-bold tracking-[0.3em] bg-background rounded-xl px-8 py-6 border-2 border-primary">
                  {activeSession.code.code}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyCode(activeSession.code!.code)}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Expires {formatDistanceToNow(new Date(activeSession.code.expires_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {/* Check-ins List */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                <LiveCheckIns sessionId={activeSession.id} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Session */}
      {!activeSession && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Active Session</h3>
            <p className="text-muted-foreground mb-4">
              Start an attendance session to generate a check-in code for students
            </p>
            <Button onClick={() => setShowStartModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Attendance
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendance sessions yet
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.created_at), "MMM d, yyyy 'at' h:mm a")}
                      {session.course && ` • ${session.course.title}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {session._count?.records || 0}
                    </Badge>
                    {session.code && new Date(session.code.expires_at) > new Date() ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Ended</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Session Modal */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Start Attendance Session"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Session Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monday Lecture"
            />
          </div>

          <div className="space-y-2">
            <Label>Course (Optional)</Label>
            <Select
              value={courseId}
              onChange={setCourseId}
              options={[
                { value: "", label: "No specific course" },
                ...courses.map((c: any) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={duration}
              onChange={setDuration}
              options={[
                { value: "15", label: "15 minutes" },
                { value: "30", label: "30 minutes" },
                { value: "60", label: "1 hour" },
                { value: "120", label: "2 hours" },
                { value: "180", label: "3 hours" },
                { value: "240", label: "4 hours" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              How long students can check in as "Present"
            </p>
          </div>

          {/* Tardy Configuration */}
          <div className="border-t pt-4 mt-4">
            <p className="font-medium text-sm mb-3">Late Check-in Settings</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tardy Window</Label>
                <Select
                  value={tardyWindow}
                  onChange={setTardyWindow}
                  options={[
                    { value: "5", label: "5 minutes" },
                    { value: "10", label: "10 minutes" },
                    { value: "15", label: "15 minutes" },
                    { value: "30", label: "30 minutes" },
                    { value: "60", label: "1 hour" },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  After code expires, students can still check in as "Tardy" within this window
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Allow late check-in</p>
                  <p className="text-xs text-muted-foreground">
                    Allow check-in even after tardy window (marked as Tardy)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowLateCheckin}
                  onChange={(e) => setAllowLateCheckin(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowStartModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartAttendance}
              isLoading={startMutation.isPending}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* Session Details Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.title || "Session Details"}
      >
        {selectedSession && (
          <SessionDetails session={selectedSession} onClose={() => setSelectedSession(null)} />
        )}
      </Modal>
    </div>
  );
}

// Live check-ins component
function LiveCheckIns({ sessionId }: { sessionId: string }) {
  const { data: checkIns = [], isLoading } = useSessionCheckIns(sessionId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium">Check-ins</p>
        <Badge variant="success">{checkIns.length}</Badge>
      </div>
      {checkIns.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Waiting for students...
        </p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {checkIns.map((checkin: any) => (
            <div
              key={checkin.id}
              className="flex items-center gap-2 p-2 rounded bg-background"
            >
              <CheckCircle className={`h-4 w-4 flex-shrink-0 ${
                checkin.status === "present" ? "text-green-500" :
                checkin.status === "late" ? "text-yellow-500" :
                "text-gray-400"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {checkin.student?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checkin.recorded_at &&
                    format(new Date(checkin.recorded_at), "h:mm a")}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(checkin.status)} className="text-xs">
                {getStatusLabel(checkin.status)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// All available attendance statuses for manual override
const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Tardy" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
  { value: "virtual", label: "Virtual" },
  { value: "left_early", label: "Left Early" },
];

// Session details component
function SessionDetails({
  session,
  onClose,
}: {
  session: AttendanceSession;
  onClose: () => void;
}) {
  const { data: checkIns = [], isLoading } = useSessionCheckIns(session.id);
  const updateStatusMutation = useUpdateAttendanceStatus();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ recordId, status: newStatus });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Count students by status
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    checkIns.forEach((c: any) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [checkIns]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Date</p>
          <p className="font-medium">
            {format(new Date(session.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Time</p>
          <p className="font-medium">{session.start_time} - {session.end_time}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Course</p>
          <p className="font-medium">{session.course?.title || "No course"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Check-ins</p>
          <p className="font-medium">{checkIns.length}</p>
        </div>
      </div>

      {/* Status Summary */}
      {checkIns.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge key={status} variant={getStatusBadgeVariant(status)}>
              {getStatusLabel(status)}: {count}
            </Badge>
          ))}
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Attendance List</p>
          <p className="text-xs text-muted-foreground">Click status to change</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No check-ins recorded
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {checkIns.map((checkin: any) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded border"
              >
                <div>
                  <p className="font-medium text-sm">
                    {checkin.student?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checkin.student?.email}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  {editingId === checkin.id ? (
                    <Select
                      value={checkin.status}
                      onChange={(newStatus) => handleStatusChange(checkin.id, newStatus)}
                      options={ATTENDANCE_STATUSES}
                    />
                  ) : (
                    <Badge
                      variant={getStatusBadgeVariant(checkin.status)}
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => setEditingId(checkin.id)}
                    >
                      {getStatusLabel(checkin.status)}
                      {checkin.was_late && checkin.status === "present" && " (was late)"}
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground min-w-[60px]">
                    {checkin.recorded_at &&
                      format(new Date(checkin.recorded_at), "h:mm a")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

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
  Alert,
  Spinner,
  Progress,
} from "@/components/ui";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

// Helper to get supabase client with type assertion for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any;

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

// Check-in result interface
interface CheckInResult {
  success: boolean;
  session_title: string;
  check_in_time: string;
  status: string;
  was_late: boolean;
}

// Hook for student check-in
function useStudentCheckIn() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<CheckInResult> => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = getDb();

      // Use the qr_check_in database function
      const { data, error } = await supabase.rpc("qr_check_in", {
        p_code: code.trim(),
        p_student_id: user.id,
        p_tenant_id: tenant.id,
      });

      if (error) {
        // Parse error message for user-friendly display
        if (error.message.includes("Invalid")) {
          throw new Error("Invalid code. Please check and try again.");
        }
        if (error.message.includes("expired") || error.message.includes("closed")) {
          throw new Error("This check-in window has closed. Please contact your instructor.");
        }
        throw error;
      }

      return data as CheckInResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["student-attendance-stats"] });
    },
  });
}

// Hook to get student's attendance history
function useAttendanceHistory() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-attendance-history", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = getDb();

      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          id, status, check_in_time, recorded_at, was_late,
          session:attendance_sessions(
            id, title, scheduled_date, start_time,
            course:courses(title)
          )
        `)
        .eq("student_id", user.id)
        .eq("tenant_id", tenant.id)
        .order("recorded_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Hook to get attendance stats
function useAttendanceStats() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["student-attendance-stats", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return null;

      const supabase = getDb();

      const { data, error } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("student_id", user.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      const records = data || [];
      const present = records.filter((r: { status: string }) => r.status === "present").length;
      const late = records.filter((r: { status: string }) => r.status === "late").length;
      const absent = records.filter((r: { status: string }) => r.status === "absent").length;
      const excused = records.filter((r: { status: string }) => r.status === "excused").length;
      const virtual = records.filter((r: { status: string }) => r.status === "virtual").length;
      const leftEarly = records.filter((r: { status: string }) => r.status === "left_early").length;
      const total = records.length;

      // Present, late, excused, and virtual all count toward attendance
      const attended = present + late + excused + virtual;
      const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 100;

      return {
        total,
        present,
        late,
        absent,
        excused,
        virtual,
        leftEarly,
        attended,
        attendanceRate,
      };
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

export default function StudentAttendancePage() {
  const [code, setCode] = React.useState("");
  const [checkInResult, setCheckInResult] = React.useState<CheckInResult | null>(null);
  const checkInMutation = useStudentCheckIn();
  const { data: history = [], isLoading: historyLoading } = useAttendanceHistory();
  const { data: stats, isLoading: statsLoading } = useAttendanceStats();

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setCheckInResult(null);
    try {
      const result = await checkInMutation.mutateAsync(code);
      setCheckInResult(result);
      setCode("");
      // Clear success after 8 seconds
      setTimeout(() => setCheckInResult(null), 8000);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCode(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">
          Check in to class with your instructor's code
        </p>
      </div>

      {/* Check-in Card */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Check In
          </CardTitle>
          <CardDescription>
            Enter the 4-digit code displayed by your instructor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckIn} className="space-y-4">
            {checkInMutation.error && (
              <Alert variant="error">
                {checkInMutation.error instanceof Error
                  ? checkInMutation.error.message
                  : "Check-in failed. Please try again."}
              </Alert>
            )}

            {checkInResult && (
              <Alert variant={checkInResult.was_late ? "warning" : "success"}>
                <CheckCircle className="h-4 w-4" />
                <div>
                  <p className="font-medium">
                    {checkInResult.was_late
                      ? "Checked in as Tardy"
                      : "You're checked in!"}
                  </p>
                  <p className="text-sm mt-1">
                    {checkInResult.session_title}
                    {checkInResult.was_late && (
                      <span className="block text-xs mt-1">
                        You checked in after the on-time window closed
                      </span>
                    )}
                  </p>
                </div>
              </Alert>
            )}

            <div className="flex flex-col items-center gap-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={handleCodeChange}
                placeholder="0000"
                className="text-center text-4xl font-mono tracking-[0.5em] h-20 max-w-[200px]"
                maxLength={4}
                autoFocus
              />
              <Button
                type="submit"
                size="lg"
                className="w-full max-w-[200px]"
                disabled={code.length !== 4 || checkInMutation.isPending}
                isLoading={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? "Checking in..." : "Check In"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : `${stats?.attendanceRate || 100}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.present || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tardy</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.late || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.absent || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Progress */}
      {stats && stats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Overall Attendance</p>
              <p className="text-sm text-muted-foreground">
                {stats.attended} / {stats.total} sessions
              </p>
            </div>
            <Progress value={stats.attendanceRate} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{stats.attendanceRate}% attendance rate</span>
              {stats.attendanceRate < 80 && (
                <span className="text-warning">Below 80% requirement</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attendance records yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check in to your first class above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {record.session?.title || "Class Session"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.session?.scheduled_date &&
                        format(new Date(record.session.scheduled_date), "MMM d, yyyy")}
                      {record.session?.course && ` • ${record.session.course.title}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {record.recorded_at &&
                        format(new Date(record.recorded_at), "h:mm a")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

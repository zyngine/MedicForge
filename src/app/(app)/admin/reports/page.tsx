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
  Spinner,
} from "@/components/ui";
import {
  Download,
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  FileText,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Hook to fetch admin stats
function useAdminStats() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["admin-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();

      // Fetch counts in parallel
      const [
        { count: usersCount },
        { count: coursesCount },
        { count: enrollmentsCount },
        { count: submissionsCount },
        { data: recentUsers },
        { data: recentCourses },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("users").select("id, full_name, email, role, created_at").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("courses").select("id, title, created_at").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
      ]);

      // Get user breakdown by role
      const { data: usersByRole } = await supabase
        .from("users")
        .select("role")
        .eq("tenant_id", tenant.id);

      const roleBreakdown = {
        admin: 0,
        instructor: 0,
        student: 0,
      };

      usersByRole?.forEach(u => {
        if (u.role && roleBreakdown[u.role as keyof typeof roleBreakdown] !== undefined) {
          roleBreakdown[u.role as keyof typeof roleBreakdown]++;
        }
      });

      // Get submission stats
      const { data: submissionStats } = await supabase
        .from("submissions")
        .select("status")
        .eq("tenant_id", tenant.id);

      const submissionBreakdown = {
        in_progress: 0,
        submitted: 0,
        graded: 0,
        returned: 0,
      };

      submissionStats?.forEach(s => {
        if (s.status && submissionBreakdown[s.status as keyof typeof submissionBreakdown] !== undefined) {
          submissionBreakdown[s.status as keyof typeof submissionBreakdown]++;
        }
      });

      return {
        totalUsers: usersCount || 0,
        totalCourses: coursesCount || 0,
        totalEnrollments: enrollmentsCount || 0,
        totalSubmissions: submissionsCount || 0,
        roleBreakdown,
        submissionBreakdown,
        recentUsers: recentUsers || [],
        recentCourses: recentCourses || [],
      };
    },
    enabled: !!tenant?.id,
  });
}

export default function AdminReportsPage() {
  const { data: stats, isLoading } = useAdminStats();

  // Export to CSV
  const exportToCSV = () => {
    if (!stats) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Users", stats.totalUsers],
      ["Admins", stats.roleBreakdown.admin],
      ["Instructors", stats.roleBreakdown.instructor],
      ["Students", stats.roleBreakdown.student],
      ["Total Courses", stats.totalCourses],
      ["Total Enrollments", stats.totalEnrollments],
      ["Total Submissions", stats.totalSubmissions],
      ["Submissions In Progress", stats.submissionBreakdown.in_progress],
      ["Submissions Pending Review", stats.submissionBreakdown.submitted],
      ["Submissions Graded", stats.submissionBreakdown.graded],
    ];

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Unable to load reports data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organization Reports</h1>
          <p className="text-muted-foreground">
            Overview of your organization&apos;s activity and metrics
          </p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <BookOpen className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">{stats.totalCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <GraduationCap className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrollments</p>
                <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User & Submission Breakdowns */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Breakdown</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <span>Administrators</span>
                </div>
                <Badge>{stats.roleBreakdown.admin}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span>Instructors</span>
                </div>
                <Badge variant="info">{stats.roleBreakdown.instructor}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Students</span>
                </div>
                <Badge variant="success">{stats.roleBreakdown.student}</Badge>
              </div>
            </div>

            {/* Visual breakdown */}
            <div className="mt-4">
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                {stats.totalUsers > 0 && (
                  <>
                    <div
                      className="bg-error h-full"
                      style={{ width: `${(stats.roleBreakdown.admin / stats.totalUsers) * 100}%` }}
                    />
                    <div
                      className="bg-info h-full"
                      style={{ width: `${(stats.roleBreakdown.instructor / stats.totalUsers) * 100}%` }}
                    />
                    <div
                      className="bg-success h-full"
                      style={{ width: `${(stats.roleBreakdown.student / stats.totalUsers) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission Status</CardTitle>
            <CardDescription>Current submission states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span>In Progress</span>
                </div>
                <Badge variant="secondary">{stats.submissionBreakdown.in_progress}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>Awaiting Review</span>
                </div>
                <Badge variant="warning">{stats.submissionBreakdown.submitted}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Graded</span>
                </div>
                <Badge variant="success">{stats.submissionBreakdown.graded}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span>Returned</span>
                </div>
                <Badge variant="info">{stats.submissionBreakdown.returned}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
            <CardDescription>Newest members of your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users yet</p>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stats.recentUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{user.full_name || "Unnamed"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Courses</CardTitle>
            <CardDescription>Newest courses created</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCourses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No courses yet</p>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stats.recentCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(course.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/billing">
                <Activity className="h-4 w-4 mr-2" />
                View Billing
              </a>
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Avatar,
  Progress,
  Spinner,
  SkeletonDashboard,
} from "@/components/ui";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Plus,
  FileText,
  GraduationCap,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { usePendingSubmissions } from "@/lib/hooks/use-submissions";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function InstructorDashboardPage() {
  const { profile, isLoading: userLoading } = useUser();
  const { data: courses = [], isLoading: coursesLoading, error: coursesError, refetch: refetchCourses } = useInstructorCourses();
  const { data: submissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = usePendingSubmissions();
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments({ includeUnpublished: true });

  const isLoading = userLoading || coursesLoading || submissionsLoading || assignmentsLoading;

  // Calculate stats from real data
  const activeCourses = courses.filter((c: any) => !c.is_archived);
  const totalStudents = activeCourses.reduce((sum, course) => sum + (course.enrollments_count || 0), 0);
  const pendingGradesCount = submissions.length;
  const avgCompletion = activeCourses.length > 0
    ? Math.round(activeCourses.reduce((sum, course) => sum + (course.modules_count || 0), 0) / activeCourses.length * 10) // Approximate
    : 0;

  // Get upcoming deadlines (assignments due in the future)
  const now = new Date();
  const upcomingDeadlines = assignments
    .filter(a => a.due_date && new Date(a.due_date) > now)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const stats = [
    {
      title: "Active Courses",
      value: activeCourses.length.toString(),
      change: `${totalStudents} total students`,
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Students",
      value: totalStudents.toString(),
      change: `Across ${activeCourses.length} courses`,
      icon: <Users className="h-5 w-5" />,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pending Grades",
      value: pendingGradesCount.toString(),
      change: pendingGradesCount > 0 ? "Review needed" : "All caught up!",
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Active Assignments",
      value: assignments.filter(a => a.is_published).length.toString(),
      change: `${upcomingDeadlines.length} due soon`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (coursesError) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4">{coursesError.message}</p>
          <Button onClick={() => { refetchCourses(); refetchSubmissions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your courses today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/instructor/courses">
              <BookOpen className="h-4 w-4 mr-2" />
              View Courses
            </Link>
          </Button>
          <Button asChild>
            <Link href="/instructor/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Submissions - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Latest assignments needing review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/grading">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submissions pending review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.slice(0, 5).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar fallback={submission.student?.full_name || "Student"} size="sm" />
                      <div>
                        <p className="font-medium text-sm">
                          {submission.student?.full_name || "Unknown Student"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.assignment?.title || "Assignment"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning">Needs Review</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {submission.submitted_at
                          ? formatRelativeTime(submission.submitted_at)
                          : "Just now"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-info" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>Assignments due soon</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deadline.due_date && formatDate(deadline.due_date)}
                        </p>
                      </div>
                      <Badge variant="secondary">{deadline.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" size="sm" asChild>
              <Link href="/instructor/calendar">View Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Courses</CardTitle>
              <CardDescription>Your current teaching assignments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/courses">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No active courses yet</p>
                <Button asChild>
                  <Link href="/instructor/courses/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCourses.slice(0, 4).map((course) => (
                  <Link
                    key={course.id}
                    href={`/instructor/courses/${course.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.enrollments_count || 0} students enrolled
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{course.course_type}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Modules</span>
                        <span className="font-medium">{course.modules_count || 0}</span>
                      </div>
                      {course.start_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {formatDate(course.start_date)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Quick Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Course Statistics</CardTitle>
              <CardDescription>Overview of your courses</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/reports">
                Reports <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeCourses.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No course data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCourses.slice(0, 4).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.course_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {course.enrollments_count || 0} students
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {course.modules_count || 0} modules
                      </p>
                    </div>
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
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/instructor/courses/new">
                <Plus className="h-5 w-5" />
                <span>Create Course</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/instructor/grading">
                <ClipboardCheck className="h-5 w-5" />
                <span>Grade Submissions</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/instructor/students">
                <Users className="h-5 w-5" />
                <span>Manage Students</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/instructor/reports">
                <BarChart3 className="h-5 w-5" />
                <span>View Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  Select,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  AlertTriangle,
  ChevronRight,
  Activity,
  Eye,
  FileText,
  Award,
} from "lucide-react";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { useCourseAnalytics } from "@/lib/hooks/use-analytics";
import { formatDate } from "@/lib/utils";

export default function InstructorAnalyticsPage() {
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses();
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("");

  // Auto-select first course
  React.useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const {
    dailyMetrics,
    engagementData,
    summary,
    engagementTrend,
    atRiskStudents,
    topPerformers,
    isLoading: analyticsLoading,
  } = useCourseAnalytics(selectedCourseId);

  const isLoading = coursesLoading || analyticsLoading;

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.title,
  }));

  if (isLoading && !selectedCourseId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Course Analytics
          </h1>
          <p className="text-muted-foreground">
            Track student engagement and course performance
          </p>
        </div>
        {courseOptions.length > 0 && (
          <Select
            options={courseOptions}
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            className="w-64"
          />
        )}
      </div>

      {!selectedCourseId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
            <p className="text-muted-foreground mb-4">
              Create a course to start tracking analytics
            </p>
            <Button asChild>
              <Link href="/instructor/courses/new">Create Course</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-3xl font-bold mt-1">
                      {summary?.totalStudents || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.activeStudents || 0} active this week
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Engagement</p>
                    <p className="text-3xl font-bold mt-1">
                      {Math.round(summary?.avgEngagementScore || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {(summary?.avgEngagementScore || 0) >= 50 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-success">Good engagement</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-warning" />
                          <span className="text-warning">Needs attention</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10 text-success">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-3xl font-bold mt-1">
                      {Math.round(summary?.avgScore || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.totalSubmissions || 0} submissions graded
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-info/10 text-info">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-3xl font-bold mt-1">
                      {Math.round(summary?.completionRate || 0)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Course completion
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 text-warning">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Engagement Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Engagement Trend (Last 30 Days)</CardTitle>
                <CardDescription>Daily active users and submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {engagementTrend.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Simple bar representation */}
                    <div className="grid grid-cols-7 gap-1">
                      {engagementTrend.slice(-14).map((day, idx) => {
                        const maxUsers = Math.max(...engagementTrend.map((d) => d.activeUsers));
                        const height = maxUsers > 0 ? (day.activeUsers / maxUsers) * 100 : 0;

                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div
                              className="w-full bg-primary/20 rounded-t relative"
                              style={{ height: "60px" }}
                            >
                              <div
                                className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {new Date(day.date).getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Active Users per Day</span>
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded" />
                        Active Users
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* At-Risk Students */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    At-Risk Students
                  </CardTitle>
                  <CardDescription>Low engagement detected</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {atRiskStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-success mb-3" />
                    <p className="text-sm text-muted-foreground">
                      All students are actively engaged!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atRiskStudents.slice(0, 5).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-warning/30 bg-warning/5"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {student.student?.full_name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.logins} logins this week
                          </p>
                        </div>
                        <Badge variant="warning">
                          {Math.round(student.engagement_score)}%
                        </Badge>
                      </div>
                    ))}
                    {atRiskStudents.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{atRiskStudents.length - 5} more students
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-success" />
                  Top Performers
                </CardTitle>
                <CardDescription>Highest engagement this week</CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No engagement data yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((student, idx) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              idx === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : idx === 1
                                ? "bg-gray-100 text-gray-700"
                                : idx === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {student.student?.full_name || "Student"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.time_spent_minutes} min · {student.assignments_submitted} submissions
                            </p>
                          </div>
                        </div>
                        <Badge variant="success">
                          {Math.round(student.engagement_score)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Engagement Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
                <CardDescription>Student engagement levels this week</CardDescription>
              </CardHeader>
              <CardContent>
                {engagementData.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No engagement data yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: "High (80-100%)", min: 80, max: 100, color: "bg-success" },
                      { label: "Medium (50-79%)", min: 50, max: 79, color: "bg-info" },
                      { label: "Low (20-49%)", min: 20, max: 49, color: "bg-warning" },
                      { label: "At Risk (0-19%)", min: 0, max: 19, color: "bg-destructive" },
                    ].map((level) => {
                      const count = engagementData.filter(
                        (s) =>
                          s.engagement_score >= level.min &&
                          s.engagement_score <= level.max
                      ).length;
                      const percentage =
                        engagementData.length > 0
                          ? (count / engagementData.length) * 100
                          : 0;

                      return (
                        <div key={level.label} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{level.label}</span>
                            <span className="font-medium">
                              {count} students ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${level.color} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Metrics Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Metrics</CardTitle>
                <CardDescription>Detailed daily statistics</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {dailyMetrics.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No daily metrics recorded yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">Active Users</th>
                        <th className="text-right py-3 px-4">Submissions</th>
                        <th className="text-right py-3 px-4">Avg Score</th>
                        <th className="text-right py-3 px-4">Content Views</th>
                        <th className="text-right py-3 px-4">Time Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMetrics.slice(-10).reverse().map((metric) => (
                        <tr key={metric.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            {formatDate(metric.metric_date)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {metric.active_users}
                          </td>
                          <td className="text-right py-3 px-4">
                            {metric.submissions_count}
                          </td>
                          <td className="text-right py-3 px-4">
                            {metric.average_score
                              ? `${Math.round(metric.average_score)}%`
                              : "-"}
                          </td>
                          <td className="text-right py-3 px-4">
                            {metric.content_views}
                          </td>
                          <td className="text-right py-3 px-4">
                            {metric.time_spent_minutes} min
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

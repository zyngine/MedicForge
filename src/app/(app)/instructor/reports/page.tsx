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
  Select,
  Spinner,
} from "@/components/ui";
import {
  Download,
  TrendingUp,
  Users,
  ClipboardCheck,
  Clock,
  Target,
} from "lucide-react";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { useSubmissions } from "@/lib/hooks/use-submissions";
import { useEnrollments } from "@/lib/hooks/use-enrollments";

export default function InstructorReportsPage() {
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses();
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments({ includeUnpublished: true });
  const { data: submissions = [], isLoading: submissionsLoading } = useSubmissions({});
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments();

  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("all");

  const isLoading = coursesLoading || assignmentsLoading || submissionsLoading || enrollmentsLoading;

  // Filter data by selected course
  const filteredAssignments = selectedCourseId === "all"
    ? assignments
    : assignments.filter(a => a.module?.course_id === selectedCourseId);

  const filteredEnrollments = selectedCourseId === "all"
    ? enrollments
    : enrollments.filter(e => e.course_id === selectedCourseId);

  const assignmentIds = new Set(filteredAssignments.map(a => a.id));
  const filteredSubmissions = selectedCourseId === "all"
    ? submissions
    : submissions.filter(s => assignmentIds.has(s.assignment_id));

  // Calculate metrics
  const totalStudents = new Set(filteredEnrollments.map(e => e.student_id)).size;
  const totalAssignments = filteredAssignments.length;
  const totalSubmissions = filteredSubmissions.length;
  const gradedSubmissions = filteredSubmissions.filter(s => s.status === "graded");
  const pendingSubmissions = filteredSubmissions.filter(s => s.status === "submitted");

  // Calculate average score
  const scoresWithGrades = gradedSubmissions.filter(s => s.final_score != null);
  const averageScore = scoresWithGrades.length > 0
    ? Math.round(scoresWithGrades.reduce((sum, s) => sum + (s.final_score || 0), 0) / scoresWithGrades.length)
    : 0;

  // Calculate completion rate
  const expectedSubmissions = totalStudents * totalAssignments;
  const completionRate = expectedSubmissions > 0
    ? Math.round((totalSubmissions / expectedSubmissions) * 100)
    : 0;

  // Grade distribution
  const gradeDistribution = {
    A: gradedSubmissions.filter(s => (s.final_score || 0) >= 90).length,
    B: gradedSubmissions.filter(s => (s.final_score || 0) >= 80 && (s.final_score || 0) < 90).length,
    C: gradedSubmissions.filter(s => (s.final_score || 0) >= 70 && (s.final_score || 0) < 80).length,
    D: gradedSubmissions.filter(s => (s.final_score || 0) >= 60 && (s.final_score || 0) < 70).length,
    F: gradedSubmissions.filter(s => (s.final_score || 0) < 60).length,
  };

  // Assignment performance
  const assignmentPerformance = filteredAssignments.map(assignment => {
    const assignmentSubmissions = filteredSubmissions.filter(s => s.assignment_id === assignment.id);
    const graded = assignmentSubmissions.filter(s => s.status === "graded" && s.final_score != null);
    const avgScore = graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + (s.final_score || 0), 0) / graded.length)
      : null;

    return {
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      submissions: assignmentSubmissions.length,
      graded: graded.length,
      averageScore: avgScore,
      pointsPossible: assignment.points_possible,
    };
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Assignment", "Type", "Submissions", "Graded", "Average Score", "Points Possible"];
    const rows = assignmentPerformance.map(a => [
      a.title,
      a.type,
      a.submissions,
      a.graded,
      a.averageScore ?? "N/A",
      a.pointsPossible,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const courseOptions = [
    { value: "all", label: "All Courses" },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Track student performance and course metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={courseOptions}
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            className="w-[200px]"
          />
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
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
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ClipboardCheck className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="text-2xl font-bold">{totalAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{averageScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grading Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grading Status</CardTitle>
            <CardDescription>Submission status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>Pending Review</span>
                </div>
                <Badge variant="warning">{pendingSubmissions.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Graded</span>
                </div>
                <Badge variant="success">{gradedSubmissions.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <span>In Progress</span>
                </div>
                <Badge variant="secondary">
                  {filteredSubmissions.filter(s => s.status === "in_progress").length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grade Distribution</CardTitle>
            <CardDescription>Breakdown by letter grade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(gradeDistribution).map(([grade, count]) => {
                const total = gradedSubmissions.length || 1;
                const percentage = Math.round((count / total) * 100);
                const colors: Record<string, string> = {
                  A: "bg-success",
                  B: "bg-info",
                  C: "bg-warning",
                  D: "bg-orange-500",
                  F: "bg-error",
                };

                return (
                  <div key={grade} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{grade}</span>
                      <span className="text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[grade]} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment Performance</CardTitle>
          <CardDescription>Performance breakdown by assignment</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assignments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Assignment</th>
                    <th className="text-left py-3 px-2 font-medium">Type</th>
                    <th className="text-center py-3 px-2 font-medium">Submissions</th>
                    <th className="text-center py-3 px-2 font-medium">Graded</th>
                    <th className="text-center py-3 px-2 font-medium">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentPerformance.map((assignment) => (
                    <tr key={assignment.id} className="border-b last:border-0">
                      <td className="py-3 px-2">
                        <span className="font-medium">{assignment.title}</span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary" className="capitalize">
                          {assignment.type?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">{assignment.submissions}</td>
                      <td className="py-3 px-2 text-center">{assignment.graded}</td>
                      <td className="py-3 px-2 text-center">
                        {assignment.averageScore !== null ? (
                          <span className={
                            assignment.averageScore >= 80 ? "text-success" :
                            assignment.averageScore >= 70 ? "text-warning" : "text-error"
                          }>
                            {assignment.averageScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="/instructor/grading">
                <Clock className="h-4 w-4 mr-2" />
                Review Pending ({pendingSubmissions.length})
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

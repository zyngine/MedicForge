"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Award,
  TrendingUp,
  BookOpen,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { useMySubmissions } from "@/lib/hooks/use-submissions";
import { formatDate } from "@/lib/utils";

export default function StudentGradesPage() {
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: submissions = [], isLoading: submissionsLoading } = useMySubmissions();

  const isLoading = enrollmentsLoading || submissionsLoading;

  // Create a course title lookup map from enrollments
  const courseMap = React.useMemo(() => {
    return new Map(enrollments.map((e) => [e.course_id, e.course?.title || "Course"]));
  }, [enrollments]);

  // Calculate grades by course
  const courseGrades = React.useMemo(() => {
    const grades: Record<
      string,
      {
        courseId: string;
        courseTitle: string;
        submissions: typeof submissions;
        totalPoints: number;
        earnedPoints: number;
        percentage: number;
        letterGrade: string;
      }
    > = {};

    enrollments.forEach((enrollment) => {
      const courseSubmissions = submissions.filter(
        (s) => s.assignment?.module?.course_id === enrollment.course_id
      );

      const totalPoints = courseSubmissions.reduce(
        (sum, s) => sum + (s.assignment?.points_possible || 0),
        0
      );
      const earnedPoints = courseSubmissions.reduce(
        (sum, s) => sum + (s.final_score || 0),
        0
      );
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      grades[enrollment.course_id] = {
        courseId: enrollment.course_id,
        courseTitle: enrollment.course?.title || "Course",
        submissions: courseSubmissions,
        totalPoints,
        earnedPoints,
        percentage,
        letterGrade: getLetterGrade(percentage),
      };
    });

    return Object.values(grades);
  }, [enrollments, submissions]);

  // Overall GPA calculation
  const overallStats = React.useMemo(() => {
    const totalPoints = submissions.reduce(
      (sum, s) => sum + (s.assignment?.points_possible || 0),
      0
    );
    const earnedPoints = submissions.reduce(
      (sum, s) => sum + (s.final_score || 0),
      0
    );
    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    return {
      totalPoints,
      earnedPoints,
      percentage,
      letterGrade: getLetterGrade(percentage),
      totalAssignments: submissions.length,
      gradedAssignments: submissions.filter((s) => s.status === "graded").length,
    };
  }, [submissions]);

  function getLetterGrade(percentage: number): string {
    if (percentage >= 93) return "A";
    if (percentage >= 90) return "A-";
    if (percentage >= 87) return "B+";
    if (percentage >= 83) return "B";
    if (percentage >= 80) return "B-";
    if (percentage >= 77) return "C+";
    if (percentage >= 73) return "C";
    if (percentage >= 70) return "C-";
    if (percentage >= 67) return "D+";
    if (percentage >= 63) return "D";
    if (percentage >= 60) return "D-";
    return "F";
  }

  function getGradeColor(percentage: number): string {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  }

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" />
          My Grades
        </h1>
        <p className="text-muted-foreground">
          View your grades and academic progress
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getGradeColor(overallStats.percentage)}`}>
                  {overallStats.letterGrade}
                </div>
                <p className="text-sm text-muted-foreground">Overall Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {overallStats.percentage.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <ClipboardList className="h-6 w-6 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overallStats.gradedAssignments}</div>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{courseGrades.length}</div>
                <p className="text-sm text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades by Course */}
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">By Course</TabsTrigger>
          <TabsTrigger value="recent">Recent Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          {courseGrades.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No grades yet</h3>
                <p className="text-muted-foreground">
                  Complete assignments to see your grades here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {courseGrades.map((course) => (
                <Card key={course.courseId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${getGradeColor(course.percentage)}`}>
                          {course.letterGrade}
                        </span>
                        <span className="text-muted-foreground">
                          ({course.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span>
                          {course.earnedPoints.toFixed(1)} / {course.totalPoints} pts
                        </span>
                      </div>
                      <Progress value={course.percentage} className="h-2" />
                    </div>

                    {course.submissions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Recent Assignments
                        </p>
                        {course.submissions.slice(0, 3).map((submission) => (
                          <Link
                            key={submission.id}
                            href={`/student/courses/${course.courseId}/assignments/${submission.assignment_id}`}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                          >
                            <span className="text-sm">
                              {submission.assignment?.title || "Assignment"}
                            </span>
                            <div className="flex items-center gap-2">
                              {submission.status === "graded" ? (
                                <Badge
                                  variant={
                                    ((submission.final_score || 0) /
                                      (submission.assignment?.points_possible || 1)) *
                                      100 >=
                                    70
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {submission.final_score?.toFixed(1)} /{" "}
                                  {submission.assignment?.points_possible}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">{submission.status}</Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                <p className="text-muted-foreground">
                  Complete assignments to see your grades here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {submissions
                .sort(
                  (a, b) =>
                    new Date(b.submitted_at || "1970-01-01").getTime() -
                    new Date(a.submitted_at || "1970-01-01").getTime()
                )
                .slice(0, 20)
                .map((submission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {submission.assignment?.title || "Assignment"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {submission.assignment?.module?.course_id ? courseMap.get(submission.assignment.module.course_id) : "Course"} &bull;{" "}
                            {submission.submitted_at
                              ? formatDate(submission.submitted_at)
                              : "Not submitted"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {submission.status === "graded" ? (
                            <>
                              <span
                                className={`text-xl font-bold ${getGradeColor(
                                  ((submission.final_score || 0) /
                                    (submission.assignment?.points_possible || 1)) *
                                    100
                                )}`}
                              >
                                {submission.final_score?.toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">
                                / {submission.assignment?.points_possible}
                              </span>
                            </>
                          ) : (
                            <Badge variant="secondary">{submission.status}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

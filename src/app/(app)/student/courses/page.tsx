"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  Search,
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  Play,
  Award,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMyEnrollments, useEnrollByCode, type EnrollmentWithDetails } from "@/lib/hooks/use-enrollments";
import { formatDate } from "@/lib/utils";

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    EMR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    EMT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    AEMT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Paramedic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    Custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors.Custom}`}>
      {type}
    </span>
  );
}

export default function StudentCoursesPage() {
  const { data: enrollments = [], isLoading, error, refetch } = useMyEnrollments();
  const { mutateAsync: enrollByCode, isPending: isEnrolling } = useEnrollByCode();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showEnrollment, setShowEnrollment] = React.useState(false);
  const [enrollmentCode, setEnrollmentCode] = React.useState("");
  const [enrollError, setEnrollError] = React.useState<string | null>(null);

  const filteredEnrollments = enrollments.filter((enrollment: EnrollmentWithDetails) => {
    const course = enrollment.course;
    if (!course) return false;
    return (
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeEnrollments = filteredEnrollments.filter((e) => e.status === "active");
  const completedEnrollments = filteredEnrollments.filter((e) => e.status === "completed");

  const handleEnroll = async () => {
    if (!enrollmentCode.trim()) return;

    setEnrollError(null);

    try {
      await enrollByCode(enrollmentCode.trim());
      setEnrollmentCode("");
      setShowEnrollment(false);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to enroll");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-error mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
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
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning.
          </p>
        </div>
        <Button onClick={() => setShowEnrollment(true)}>
          Enroll in Course
        </Button>
      </div>

      {/* Enrollment Card */}
      {showEnrollment && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-medium mb-2">Enter Enrollment Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your instructor will provide you with an enrollment code to join their course.
                </p>
              </div>

              {enrollError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-error/10 text-error text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {enrollError}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., ABC123"
                  value={enrollmentCode}
                  onChange={(e) => {
                    setEnrollmentCode(e.target.value.toUpperCase());
                    setEnrollError(null);
                  }}
                  className="max-w-xs font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEnroll();
                    }
                  }}
                />
                <Button onClick={handleEnroll} disabled={!enrollmentCode || isEnrolling}>
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    "Enroll"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEnrollment(false);
                    setEnrollmentCode("");
                    setEnrollError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* No courses state */}
      {enrollments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by enrolling in a course with an enrollment code from your instructor.
            </p>
            <Button onClick={() => setShowEnrollment(true)}>
              Enroll in Course
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Courses */}
      {activeEnrollments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Courses</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {activeEnrollments.map((enrollment) => {
              const course = enrollment.course!;
              return (
                <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        {getTypeBadge(course.course_type)}
                      </div>
                      <Badge variant="success">In Progress</Badge>
                    </div>

                    <Link href={`/student/courses/${course.id}`} className="block group">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {course.description || "No description"}
                      </p>
                    </Link>

                    <div className="space-y-4">
                      {course.instructor && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{course.instructor.full_name}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{enrollment.completion_percentage}%</span>
                        </div>
                        <Progress value={enrollment.completion_percentage} size="sm" />
                        {course.modules_count !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {course.modules_count} modules in this course
                          </p>
                        )}
                      </div>

                      {(course.start_date || course.end_date) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {course.start_date && formatDate(course.start_date)}
                            {course.start_date && course.end_date && " - "}
                            {course.end_date && formatDate(course.end_date)}
                          </span>
                        </div>
                      )}

                      <Button className="w-full" asChild>
                        <Link href={`/student/courses/${course.id}`}>
                          <Play className="h-4 w-4 mr-2" />
                          Continue Learning
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      {completedEnrollments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Completed Courses</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {completedEnrollments.map((enrollment) => {
              const course = enrollment.course!;
              return (
                <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/10">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                        {getTypeBadge(course.course_type)}
                      </div>
                      <Badge variant="success">Completed</Badge>
                    </div>

                    <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description || "No description"}
                    </p>

                    {course.instructor && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Users className="h-4 w-4" />
                        <span>{course.instructor.full_name}</span>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <Progress value={100} size="sm" variant="success" />
                      <p className="text-xs text-success">
                        Course completed
                        {enrollment.final_grade !== null && (
                          <> with a grade of {enrollment.final_grade}%</>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link href={`/student/courses/${course.id}`}>
                          Review Course
                        </Link>
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Award className="h-4 w-4 mr-2" />
                        Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

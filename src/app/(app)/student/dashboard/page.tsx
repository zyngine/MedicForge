"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Spinner,
  SkeletonDashboard,
} from "@/components/ui";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  Award,
  ChevronRight,
  Calendar,
  Play,
  FileText,
  Stethoscope,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { useMySubmissions } from "@/lib/hooks/use-submissions";
import { useStudentClinicalHours } from "@/lib/hooks/use-clinical-logs";
import { useMyBookings } from "@/lib/hooks/use-shift-bookings";
import { formatDate } from "@/lib/utils";

function getAssignmentIcon(type: string) {
  switch (type) {
    case "quiz":
      return <ClipboardCheck className="h-4 w-4" />;
    case "written":
      return <FileText className="h-4 w-4" />;
    case "skill_checklist":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getDaysUntil(dateString: string): number {
  const dueDate = new Date(dateString);
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function StudentDashboardPage() {
  const { profile, isLoading: userLoading } = useUser();
  const { data: enrollments = [], isLoading: enrollmentsLoading, error: enrollmentsError, refetch: refetchEnrollments } = useMyEnrollments();
  const { data: submissions = [], isLoading: submissionsLoading } = useMySubmissions();
  const { data: clinicalHours, isLoading: clinicalLoading } = useStudentClinicalHours(profile?.id || null, null);
  const { bookings: upcomingShifts, isLoading: shiftsLoading } = useMyBookings();

  const isLoading = userLoading || enrollmentsLoading;

  // Filter for pending assignments (not submitted yet)
  const pendingSubmissions = submissions.filter(s => s.status === "in_progress" && s.assignment);

  // Filter for graded submissions
  const gradedSubmissions = submissions
    .filter(s => s.status === "graded" && s.final_score !== null)
    .slice(0, 5);

  // Calculate overall grade from graded submissions
  const overallGrade = gradedSubmissions.length > 0
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => {
          const maxScore = s.assignment?.points_possible || 100;
          return sum + ((s.final_score || 0) / maxScore) * 100;
        }, 0) / gradedSubmissions.length
      )
    : 0;

  // Get active enrollments with course data
  const activeEnrollments = enrollments.filter(e => e.status === "active");

  // Get upcoming shifts
  const upcomingShiftsList = upcomingShifts
    .filter(b => b.status === "booked" && b.shift)
    .slice(0, 3);

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (enrollmentsError) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-error mb-4">{enrollmentsError.message}</p>
          <Button onClick={() => refetchEnrollments()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Student";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground">
            Here&apos;s your learning progress for today.
          </p>
        </div>
        <Button asChild>
          <Link href="/student/courses">
            <Play className="h-4 w-4 mr-2" />
            Continue Learning
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                <p className="text-3xl font-bold mt-1">{activeEnrollments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeEnrollments.filter(e => (e.completion_percentage || 0) < 100).length} in progress
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Assignments</p>
                <p className="text-3xl font-bold mt-1">{pendingSubmissions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingSubmissions.filter(s => s.assignment?.due_date && getDaysUntil(s.assignment.due_date) <= 7).length} due this week
                </p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 text-warning">
                <ClipboardCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Grade</p>
                <p className="text-3xl font-bold mt-1">{overallGrade || "--"}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {gradedSubmissions.length} graded assignments
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clinical Hours</p>
                <p className="text-3xl font-bold mt-1">
                  {clinicalLoading ? "--" : (clinicalHours?.totalHours || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  hours logged
                </p>
              </div>
              <div className="p-3 rounded-lg bg-info/10 text-info">
                <Stethoscope className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Continue where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/courses">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeEnrollments.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No courses yet</p>
                  <Button asChild>
                    <Link href="/student/courses">Browse Courses</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeEnrollments.slice(0, 3).map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      href={`/student/courses/${enrollment.course_id}`}
                      className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{enrollment.course?.title || "Course"}</p>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.course?.course_type || "Course"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={enrollment.completion_percentage === 100 ? "success" : "secondary"}>
                          {enrollment.course?.course_type || "Course"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {enrollment.completion_percentage === 100 ? "Completed" : "In Progress"}
                          </span>
                          <span className="font-medium">{Math.round(enrollment.completion_percentage || 0)}%</span>
                        </div>
                        <Progress
                          value={enrollment.completion_percentage || 0}
                          size="sm"
                          variant={enrollment.completion_percentage === 100 ? "success" : "default"}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assignments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Assignments</CardTitle>
                <CardDescription>Due dates coming up</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/assignments">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 mx-auto text-success mb-3" />
                  <p className="text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.slice(0, 5).map((submission) => {
                    const daysLeft = submission.assignment?.due_date
                      ? getDaysUntil(submission.assignment.due_date)
                      : null;

                    return (
                      <Link
                        key={submission.id}
                        href={`/student/assignments/${submission.assignment_id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            submission.assignment?.type === "quiz" ? "bg-primary/10 text-primary" :
                            submission.assignment?.type === "written" ? "bg-info/10 text-info" :
                            "bg-success/10 text-success"
                          }`}>
                            {getAssignmentIcon(submission.assignment?.type || "quiz")}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{submission.assignment?.title || "Assignment"}</p>
                            <p className="text-xs text-muted-foreground">
                              {submission.assignment?.points_possible || 0} pts
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {daysLeft !== null && (
                            <p className={`text-sm font-medium ${
                              daysLeft <= 1 ? "text-error" :
                              daysLeft <= 3 ? "text-warning" :
                              ""
                            }`}>
                              {daysLeft <= 0 ? "Overdue!" :
                               daysLeft === 1 ? "Due tomorrow!" :
                               daysLeft <= 7 ? `${daysLeft} days left` :
                               formatDate(submission.assignment?.due_date || "")}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Shifts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming Shifts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/clinical/my-shifts">
                  <Calendar className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : upcomingShiftsList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No upcoming shifts</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/student/clinical/schedule">Book Shift</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingShiftsList.map((booking) => (
                    <div key={booking.id} className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-info/10 text-info">
                        <Stethoscope className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{booking.shift?.site?.name || "Clinical Site"}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.shift?.shift_date ? formatDate(booking.shift.shift_date) : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.shift?.start_time} - {booking.shift?.end_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Grades */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Grades</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/grades">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {gradedSubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No grades yet
                </p>
              ) : (
                <div className="space-y-3">
                  {gradedSubmissions.map((submission) => {
                    const maxScore = submission.assignment?.points_possible || 100;
                    const percentage = ((submission.final_score || 0) / maxScore) * 100;

                    return (
                      <div key={submission.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {submission.assignment?.title || "Assignment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {submission.graded_at ? formatDate(submission.graded_at) : ""}
                          </p>
                        </div>
                        <Badge variant={
                          percentage >= 90 ? "success" :
                          percentage >= 70 ? "warning" :
                          "destructive"
                        }>
                          {submission.final_score}/{maxScore}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Clinical Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clinicalLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Clinical Hours</span>
                      <span className="font-medium">
                        {clinicalHours?.totalHours || 0} hrs
                      </span>
                    </div>
                    <Progress
                      value={Math.min(((clinicalHours?.totalHours || 0) / 48) * 100, 100)}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Patient Contacts</span>
                      <span className="font-medium">
                        {clinicalHours?.patientContacts || 0}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(((clinicalHours?.patientContacts || 0) / 30) * 100, 100)}
                      size="sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/student/clinical">
                      Log Clinical Hours
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

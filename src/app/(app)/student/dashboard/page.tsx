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
} from "@/components/ui";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  Award,
  ChevronRight,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  FileText,
  Stethoscope,
} from "lucide-react";

// Mock data
const enrolledCourses = [
  {
    id: "1",
    title: "EMT Basic - Spring 2024",
    type: "EMT",
    progress: 65,
    currentModule: "Patient Assessment",
    nextClass: "Today, 2:00 PM",
    instructor: "Dr. Sarah Johnson",
  },
  {
    id: "2",
    title: "CPR/AED Certification",
    type: "Certification",
    progress: 100,
    currentModule: "Completed",
    nextClass: null,
    instructor: "Dr. James Miller",
  },
];

const upcomingAssignments = [
  {
    id: "1",
    title: "Module 3 Quiz - Patient Assessment",
    course: "EMT Basic - Spring 2024",
    type: "quiz",
    dueDate: "Feb 20, 11:59 PM",
    daysLeft: 5,
    points: 100,
  },
  {
    id: "2",
    title: "Written Assignment - Trauma Assessment",
    course: "EMT Basic - Spring 2024",
    type: "written",
    dueDate: "Feb 22, 11:59 PM",
    daysLeft: 7,
    points: 75,
  },
  {
    id: "3",
    title: "Skill Checklist - Vital Signs",
    course: "EMT Basic - Spring 2024",
    type: "skill",
    dueDate: "Feb 28, 11:59 PM",
    daysLeft: 13,
    points: 100,
  },
];

const recentGrades = [
  {
    id: "1",
    title: "Module 2 Quiz - Airway Management",
    course: "EMT Basic - Spring 2024",
    score: 92,
    maxScore: 100,
    gradedAt: "Feb 12",
  },
  {
    id: "2",
    title: "Written Assignment - Legal Issues",
    course: "EMT Basic - Spring 2024",
    score: 88,
    maxScore: 100,
    gradedAt: "Feb 10",
  },
  {
    id: "3",
    title: "Module 1 Quiz - Introduction to EMS",
    course: "EMT Basic - Spring 2024",
    score: 95,
    maxScore: 100,
    gradedAt: "Feb 5",
  },
];

const clinicalProgress = {
  hoursCompleted: 24,
  hoursRequired: 48,
  patientContacts: 15,
  patientContactsRequired: 30,
  skillsCompleted: 8,
  skillsRequired: 15,
};

const upcomingEvents = [
  {
    id: "1",
    title: "Lecture: Airway Management",
    type: "class",
    date: "Today",
    time: "2:00 PM",
    location: "Room 301",
  },
  {
    id: "2",
    title: "Lab Session: IV Skills",
    type: "lab",
    date: "Tomorrow",
    time: "10:00 AM",
    location: "Skills Lab",
  },
  {
    id: "3",
    title: "Clinical Rotation",
    type: "clinical",
    date: "Friday",
    time: "7:00 AM",
    location: "City Hospital",
  },
];

function getAssignmentIcon(type: string) {
  switch (type) {
    case "quiz":
      return <ClipboardCheck className="h-4 w-4" />;
    case "written":
      return <FileText className="h-4 w-4" />;
    case "skill":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function StudentDashboardPage() {
  const overallGrade = Math.round(
    recentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / recentGrades.length
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, Michael!</h1>
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
                <p className="text-3xl font-bold mt-1">{enrolledCourses.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  1 in progress
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
                <p className="text-3xl font-bold mt-1">{upcomingAssignments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  1 due this week
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
                <p className="text-3xl font-bold mt-1">{overallGrade}%</p>
                <p className="text-xs text-success mt-1">
                  +3% from last week
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
                  {clinicalProgress.hoursCompleted}/{clinicalProgress.hoursRequired}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% complete
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
              <div className="space-y-4">
                {enrolledCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/student/courses/${course.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.instructor}
                          </p>
                        </div>
                      </div>
                      <Badge variant={course.progress === 100 ? "success" : "secondary"}>
                        {course.type}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {course.progress === 100 ? "Completed" : `Current: ${course.currentModule}`}
                        </span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress
                        value={course.progress}
                        size="sm"
                        variant={course.progress === 100 ? "success" : "default"}
                      />
                    </div>
                    {course.nextClass && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next class: {course.nextClass}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
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
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/student/assignments/${assignment.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        assignment.type === "quiz" ? "bg-primary/10 text-primary" :
                        assignment.type === "written" ? "bg-info/10 text-info" :
                        "bg-success/10 text-success"
                      }`}>
                        {getAssignmentIcon(assignment.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">{assignment.course}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        assignment.daysLeft <= 3 ? "text-destructive" :
                        assignment.daysLeft <= 7 ? "text-warning" :
                        ""
                      }`}>
                        {assignment.daysLeft <= 1 ? "Due tomorrow!" :
                         assignment.daysLeft <= 3 ? `${assignment.daysLeft} days left` :
                         assignment.dueDate}
                      </p>
                      <p className="text-xs text-muted-foreground">{assignment.points} pts</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/calendar">
                  <Calendar className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${
                      event.type === "class" ? "bg-primary/10 text-primary" :
                      event.type === "lab" ? "bg-success/10 text-success" :
                      "bg-info/10 text-info"
                    }`}>
                      {event.type === "class" ? <BookOpen className="h-3 w-3" /> :
                       event.type === "lab" ? <CheckCircle className="h-3 w-3" /> :
                       <Stethoscope className="h-3 w-3" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.date} at {event.time}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="space-y-3">
                {recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{grade.title}</p>
                      <p className="text-xs text-muted-foreground">{grade.gradedAt}</p>
                    </div>
                    <Badge variant={
                      grade.score / grade.maxScore >= 0.9 ? "success" :
                      grade.score / grade.maxScore >= 0.7 ? "warning" :
                      "destructive"
                    }>
                      {grade.score}/{grade.maxScore}
                    </Badge>
                  </div>
                ))}
              </div>
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clinical Hours</span>
                  <span className="font-medium">
                    {clinicalProgress.hoursCompleted}/{clinicalProgress.hoursRequired}
                  </span>
                </div>
                <Progress
                  value={(clinicalProgress.hoursCompleted / clinicalProgress.hoursRequired) * 100}
                  size="sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patient Contacts</span>
                  <span className="font-medium">
                    {clinicalProgress.patientContacts}/{clinicalProgress.patientContactsRequired}
                  </span>
                </div>
                <Progress
                  value={(clinicalProgress.patientContacts / clinicalProgress.patientContactsRequired) * 100}
                  size="sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Skills Verified</span>
                  <span className="font-medium">
                    {clinicalProgress.skillsCompleted}/{clinicalProgress.skillsRequired}
                  </span>
                </div>
                <Progress
                  value={(clinicalProgress.skillsCompleted / clinicalProgress.skillsRequired) * 100}
                  size="sm"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/student/clinical">
                  Log Clinical Hours
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

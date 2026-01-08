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
} from "lucide-react";

// Mock data - will be replaced with real data from Supabase
const stats = [
  {
    title: "Active Courses",
    value: "4",
    change: "+1 this month",
    icon: <BookOpen className="h-5 w-5" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Total Students",
    value: "127",
    change: "+12 this month",
    icon: <Users className="h-5 w-5" />,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Pending Grades",
    value: "23",
    change: "8 due today",
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Avg. Completion",
    value: "78%",
    change: "+5% this month",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

const recentSubmissions = [
  {
    id: "1",
    student: "Michael Chen",
    assignment: "Module 3 Quiz - Patient Assessment",
    course: "EMT Basic - Spring 2024",
    submittedAt: "10 minutes ago",
    status: "pending",
  },
  {
    id: "2",
    student: "Emily Rodriguez",
    assignment: "Written Assignment - Cardiac Emergencies",
    course: "Paramedic - Fall 2024",
    submittedAt: "25 minutes ago",
    status: "pending",
  },
  {
    id: "3",
    student: "James Wilson",
    assignment: "Skill Checklist - IV Insertion",
    course: "AEMT - Spring 2024",
    submittedAt: "1 hour ago",
    status: "pending",
  },
  {
    id: "4",
    student: "Sarah Thompson",
    assignment: "Module 2 Quiz - Airway Management",
    course: "EMT Basic - Spring 2024",
    submittedAt: "2 hours ago",
    status: "graded",
    score: 92,
  },
];

const atRiskStudents = [
  {
    id: "1",
    name: "David Martinez",
    course: "EMT Basic - Spring 2024",
    issue: "3 missed assignments",
    progress: 45,
  },
  {
    id: "2",
    name: "Ashley Brown",
    course: "Paramedic - Fall 2024",
    issue: "Below 70% average",
    progress: 62,
  },
  {
    id: "3",
    name: "Kevin Lee",
    course: "AEMT - Spring 2024",
    issue: "2 failed skill attempts",
    progress: 55,
  },
];

const upcomingDeadlines = [
  {
    id: "1",
    title: "Module 4 Quiz Due",
    course: "EMT Basic - Spring 2024",
    date: "Today, 11:59 PM",
    submissions: "18/32",
  },
  {
    id: "2",
    title: "Clinical Hours Review",
    course: "Paramedic - Fall 2024",
    date: "Tomorrow, 5:00 PM",
    submissions: "24/28",
  },
  {
    id: "3",
    title: "Midterm Exam",
    course: "AEMT - Spring 2024",
    date: "In 3 days",
    submissions: "0/22",
  },
];

const activeCourses = [
  {
    id: "1",
    title: "EMT Basic - Spring 2024",
    type: "EMT",
    students: 32,
    progress: 65,
    nextClass: "Today, 2:00 PM",
  },
  {
    id: "2",
    title: "Paramedic - Fall 2024",
    type: "Paramedic",
    students: 28,
    progress: 42,
    nextClass: "Tomorrow, 9:00 AM",
  },
  {
    id: "3",
    title: "AEMT - Spring 2024",
    type: "AEMT",
    students: 22,
    progress: 78,
    nextClass: "Wed, 1:00 PM",
  },
];

export default function InstructorDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, Dr. Johnson</h1>
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
            <div className="space-y-4">
              {recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar fallback={submission.student} size="sm" />
                    <div>
                      <p className="font-medium text-sm">{submission.student}</p>
                      <p className="text-xs text-muted-foreground">
                        {submission.assignment}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submission.course}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {submission.status === "pending" ? (
                      <Badge variant="warning">Needs Review</Badge>
                    ) : (
                      <Badge variant="success">{submission.score}%</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {submission.submittedAt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                At-Risk Students
              </CardTitle>
              <CardDescription>Students needing attention</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atRiskStudents.map((student) => (
                <div key={student.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar fallback={student.name} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.issue}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Progress value={student.progress} size="sm" variant="warning" />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" size="sm">
              View All Students
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
            <div className="space-y-4">
              {activeCourses.map((course) => (
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
                          {course.students} students enrolled
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{course.type}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next class: {course.nextClass}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Assignments and exams due soon</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/calendar">
                View Calendar <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{deadline.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {deadline.course}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{deadline.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {deadline.submissions} submitted
                    </p>
                  </div>
                </div>
              ))}
            </div>
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

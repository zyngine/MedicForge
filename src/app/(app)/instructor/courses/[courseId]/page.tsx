"use client";

import * as React from "react";
import { useParams } from "next/navigation";
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
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  ArrowLeft,
  BookOpen,
  Users,
  ClipboardCheck,
  Clock,
  Settings,
  Plus,
  MoreVertical,
  GraduationCap,
  FileText,
  Calendar,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Edit,
  Copy,
  Trash2,
  ChevronRight,
  Play,
  CheckCircle,
  Circle,
  Video,
  File,
} from "lucide-react";

// Mock course data
const courseData = {
  id: "1",
  title: "EMT Basic - Spring 2024",
  description: "Comprehensive EMT certification course covering all NREMT requirements including patient assessment, airway management, trauma care, and medical emergencies.",
  type: "EMT",
  enrollmentCode: "EMT2024S",
  students: 32,
  maxStudents: 40,
  progress: 65,
  startDate: "2024-01-15",
  endDate: "2024-05-15",
  status: "active",
  instructor: "Dr. Sarah Johnson",
};

const modules = [
  {
    id: "1",
    title: "Introduction to EMS",
    description: "Overview of emergency medical services and the EMT role",
    lessons: 5,
    completedLessons: 5,
    assignments: 2,
    status: "completed",
    order: 1,
  },
  {
    id: "2",
    title: "Medical, Legal, and Ethical Issues",
    description: "Understanding legal responsibilities and ethical considerations",
    lessons: 4,
    completedLessons: 4,
    assignments: 1,
    status: "completed",
    order: 2,
  },
  {
    id: "3",
    title: "Patient Assessment",
    description: "Comprehensive patient assessment techniques",
    lessons: 8,
    completedLessons: 6,
    assignments: 3,
    status: "in_progress",
    order: 3,
  },
  {
    id: "4",
    title: "Airway Management",
    description: "Airway assessment and management techniques",
    lessons: 6,
    completedLessons: 0,
    assignments: 2,
    status: "locked",
    order: 4,
  },
  {
    id: "5",
    title: "Cardiac Emergencies",
    description: "Recognition and management of cardiac emergencies",
    lessons: 7,
    completedLessons: 0,
    assignments: 2,
    status: "locked",
    order: 5,
  },
];

const recentStudents = [
  { id: "1", name: "Michael Chen", email: "m.chen@email.com", progress: 78, grade: 92 },
  { id: "2", name: "Emily Rodriguez", email: "e.rodriguez@email.com", progress: 72, grade: 88 },
  { id: "3", name: "James Wilson", email: "j.wilson@email.com", progress: 65, grade: 85 },
  { id: "4", name: "Sarah Thompson", email: "s.thompson@email.com", progress: 45, grade: 72 },
  { id: "5", name: "David Martinez", email: "d.martinez@email.com", progress: 38, grade: 68 },
];

const recentAssignments = [
  { id: "1", title: "Module 3 Quiz - Patient Assessment", type: "quiz", dueDate: "2024-02-20", submissions: 28, total: 32, avgScore: 84 },
  { id: "2", title: "Written Assignment - Cardiac Emergencies", type: "written", dueDate: "2024-02-25", submissions: 18, total: 32, avgScore: null },
  { id: "3", title: "Skill Checklist - Vital Signs", type: "skill", dueDate: "2024-02-28", submissions: 30, total: 32, avgScore: 91 },
];

const upcomingEvents = [
  { id: "1", title: "Lecture: Airway Management", type: "class", date: "Today, 2:00 PM", location: "Room 301" },
  { id: "2", title: "Lab Session: IV Skills", type: "lab", date: "Tomorrow, 10:00 AM", location: "Skills Lab" },
  { id: "3", title: "Module 3 Quiz Due", type: "deadline", date: "Feb 20, 11:59 PM", location: null },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "in_progress":
      return <Badge variant="info">In Progress</Badge>;
    case "locked":
      return <Badge variant="secondary">Locked</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getModuleIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "in_progress":
      return <Play className="h-5 w-5 text-primary" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/instructor/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>

      {/* Course Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{courseData.type}</Badge>
                  <Badge variant="success">Active</Badge>
                </div>
                <h1 className="text-2xl font-bold mb-2">{courseData.title}</h1>
                <p className="text-muted-foreground max-w-2xl">{courseData.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Students</span>
              </div>
              <p className="text-2xl font-bold">{courseData.students}/{courseData.maxStudents}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Modules</span>
              </div>
              <p className="text-2xl font-bold">{modules.length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Progress</span>
              </div>
              <p className="text-2xl font-bold">{courseData.progress}%</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Enrollment Code</span>
              </div>
              <p className="text-xl font-mono font-bold">{courseData.enrollmentCode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Module Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Progress</CardTitle>
                  <CardDescription>Current progress through course content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modules.slice(0, 4).map((module) => (
                      <div key={module.id} className="flex items-center gap-4 p-3 rounded-lg border">
                        {getModuleIcon(module.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium truncate">{module.title}</h4>
                            {getStatusBadge(module.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{module.completedLessons}/{module.lessons} lessons</span>
                            <span>{module.assignments} assignments</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-4" asChild>
                    <Link href={`/instructor/courses/${courseId}/modules`}>
                      View All Modules <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Assignments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Assignments</CardTitle>
                    <CardDescription>Latest assignment activity</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/instructor/courses/${courseId}/assignments/new`}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {assignment.type === "quiz" ? (
                              <ClipboardCheck className="h-4 w-4" />
                            ) : assignment.type === "written" ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">Due: {assignment.dueDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{assignment.submissions}/{assignment.total}</p>
                          <p className="text-xs text-muted-foreground">submissions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${
                          event.type === "class" ? "bg-primary/10 text-primary" :
                          event.type === "lab" ? "bg-success/10 text-success" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {event.type === "class" ? <Video className="h-3 w-3" /> :
                           event.type === "lab" ? <GraduationCap className="h-3 w-3" /> :
                           <Clock className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.date}</p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground">{event.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Students */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentStudents.filter(s => s.progress < 50).map((student) => (
                      <div key={student.id} className="flex items-center gap-3">
                        <Avatar fallback={student.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.progress}% complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-3">
                    View All Students
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Class Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">84%</p>
                    <p className="text-sm text-muted-foreground mt-1">Overall Grade</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xl font-bold">92%</p>
                      <p className="text-xs text-muted-foreground">Quiz Avg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">78%</p>
                      <p className="text-xs text-muted-foreground">Assignment Avg</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Modules</CardTitle>
                <CardDescription>Manage course content and structure</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {module.order}
                    </div>
                    {getModuleIcon(module.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{module.title}</h4>
                        {getStatusBadge(module.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <File className="h-3 w-3" />
                          {module.lessons} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="h-3 w-3" />
                          {module.assignments} assignments
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>Manage quizzes, written assignments, and skill checklists</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        assignment.type === "quiz" ? "bg-primary/10 text-primary" :
                        assignment.type === "written" ? "bg-info/10 text-info" :
                        "bg-success/10 text-success"
                      }`}>
                        {assignment.type === "quiz" ? (
                          <ClipboardCheck className="h-5 w-5" />
                        ) : assignment.type === "written" ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{assignment.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {assignment.type.charAt(0).toUpperCase() + assignment.type.slice(1)}
                          </Badge>
                          <span>Due: {assignment.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium">{assignment.submissions}/{assignment.total}</p>
                        <p className="text-xs text-muted-foreground">submitted</p>
                      </div>
                      {assignment.avgScore && (
                        <div className="text-right">
                          <p className="font-medium">{assignment.avgScore}%</p>
                          <p className="text-xs text-muted-foreground">avg score</p>
                        </div>
                      )}
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>{courseData.students} students enrolled</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Search students..." className="w-[250px]" />
                <Button variant="outline">
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar fallback={student.name} size="md" />
                      <div>
                        <h4 className="font-medium">{student.name}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="w-32">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} size="sm" />
                      </div>
                      <div className="text-right w-20">
                        <p className={`text-lg font-bold ${
                          student.grade >= 80 ? "text-success" :
                          student.grade >= 70 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {student.grade}%
                        </p>
                        <p className="text-xs text-muted-foreground">Grade</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Grade Center</CardTitle>
                <CardDescription>View and manage student grades</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  Apply Curve
                </Button>
                <Button variant="outline">
                  Export Grades
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Grade center will display a full gradebook with all assignments and student scores.</p>
                <p className="text-sm mt-2">This feature is coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>NREMT Competency Tracking</CardTitle>
                <CardDescription>Track student skills and clinical requirements</CardDescription>
              </div>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure Skills
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>NREMT competency tracking dashboard will show skill completion, clinical hours, and patient contacts.</p>
                <p className="text-sm mt-2">This feature is coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

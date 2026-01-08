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
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle,
  Circle,
  Play,
  Lock,
  FileText,
  Video,
  ClipboardCheck,
  ChevronRight,
  Download,
  Users,
  Calendar,
  Award,
} from "lucide-react";

// Mock course data
const courseData = {
  id: "1",
  title: "EMT Basic - Spring 2024",
  description: "Comprehensive EMT certification course covering all NREMT requirements including patient assessment, airway management, trauma care, and medical emergencies.",
  type: "EMT",
  instructor: "Dr. Sarah Johnson",
  progress: 65,
  startDate: "Jan 15, 2024",
  endDate: "May 15, 2024",
  totalStudents: 32,
};

interface Assignment {
  id: string;
  title: string;
  type: string;
  score: number | null;
  maxScore: number;
  dueDate?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  status: string;
  lessons: { id: string; title: string; type: string; duration: string; completed: boolean }[];
  assignments: Assignment[];
}

const modules: Module[] = [
  {
    id: "1",
    title: "Introduction to EMS",
    description: "Overview of emergency medical services and the EMT role",
    status: "completed",
    lessons: [
      { id: "1-1", title: "Welcome to EMT Basic", type: "video", duration: "10 min", completed: true },
      { id: "1-2", title: "History of EMS", type: "reading", duration: "15 min", completed: true },
      { id: "1-3", title: "EMS Systems", type: "video", duration: "20 min", completed: true },
      { id: "1-4", title: "Roles and Responsibilities", type: "reading", duration: "10 min", completed: true },
    ],
    assignments: [
      { id: "a1", title: "Module 1 Quiz", type: "quiz", score: 95, maxScore: 100 },
    ],
  },
  {
    id: "2",
    title: "Medical, Legal, and Ethical Issues",
    description: "Understanding legal responsibilities and ethical considerations",
    status: "completed",
    lessons: [
      { id: "2-1", title: "Consent and Refusal", type: "video", duration: "15 min", completed: true },
      { id: "2-2", title: "Documentation", type: "reading", duration: "20 min", completed: true },
      { id: "2-3", title: "HIPAA and Patient Privacy", type: "video", duration: "12 min", completed: true },
    ],
    assignments: [
      { id: "a2", title: "Written Assignment - Legal Scenarios", type: "written", score: 88, maxScore: 100 },
    ],
  },
  {
    id: "3",
    title: "Patient Assessment",
    description: "Comprehensive patient assessment techniques",
    status: "in_progress",
    lessons: [
      { id: "3-1", title: "Scene Size-Up", type: "video", duration: "18 min", completed: true },
      { id: "3-2", title: "Primary Assessment", type: "video", duration: "25 min", completed: true },
      { id: "3-3", title: "Secondary Assessment", type: "video", duration: "30 min", completed: false },
      { id: "3-4", title: "Vital Signs", type: "reading", duration: "20 min", completed: false },
      { id: "3-5", title: "Patient History - SAMPLE & OPQRST", type: "video", duration: "15 min", completed: false },
    ],
    assignments: [
      { id: "a3", title: "Module 3 Quiz - Patient Assessment", type: "quiz", dueDate: "Feb 20", score: null, maxScore: 100 },
      { id: "a4", title: "Skill Checklist - Vital Signs", type: "skill", dueDate: "Feb 28", score: null, maxScore: 100 },
    ],
  },
  {
    id: "4",
    title: "Airway Management",
    description: "Airway assessment and management techniques",
    status: "locked",
    lessons: [
      { id: "4-1", title: "Airway Anatomy", type: "video", duration: "20 min", completed: false },
      { id: "4-2", title: "Basic Airway Maneuvers", type: "video", duration: "15 min", completed: false },
      { id: "4-3", title: "Airway Adjuncts", type: "reading", duration: "15 min", completed: false },
    ],
    assignments: [
      { id: "a5", title: "Skill Checklist - Airway Management", type: "skill", dueDate: "Mar 10", score: null, maxScore: 100 },
    ],
  },
  {
    id: "5",
    title: "Cardiac Emergencies",
    description: "Recognition and management of cardiac emergencies",
    status: "locked",
    lessons: [
      { id: "5-1", title: "Cardiac Anatomy & Physiology", type: "video", duration: "25 min", completed: false },
      { id: "5-2", title: "Chest Pain Assessment", type: "video", duration: "20 min", completed: false },
      { id: "5-3", title: "CPR & AED", type: "video", duration: "30 min", completed: false },
    ],
    assignments: [
      { id: "a6", title: "Written Assignment - Cardiac Emergencies", type: "written", dueDate: "Mar 25", score: null, maxScore: 75 },
    ],
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "in_progress":
      return <Play className="h-5 w-5 text-primary" />;
    case "locked":
      return <Lock className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getLessonIcon(type: string) {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "reading":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [expandedModule, setExpandedModule] = React.useState<string | null>("3");

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.completed).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{courseData.type}</Badge>
                  <Badge variant="success">In Progress</Badge>
                </div>
                <h1 className="text-2xl font-bold mb-2">{courseData.title}</h1>
                <p className="text-muted-foreground max-w-2xl">{courseData.description}</p>
              </div>
            </div>
            <Button size="lg">
              <Play className="h-4 w-4 mr-2" />
              Continue Learning
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Instructor</span>
              </div>
              <p className="font-medium">{courseData.instructor}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Progress</span>
              </div>
              <p className="text-2xl font-bold">{courseData.progress}%</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Lessons</span>
              </div>
              <p className="text-2xl font-bold">{completedLessons}/{totalLessons}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Ends</span>
              </div>
              <p className="font-medium">{courseData.endDate}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={courseData.progress} size="md" showValue />
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Course Content</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grades">My Grades</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
              <CardDescription>
                Complete modules in order to progress through the course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className={`border rounded-lg overflow-hidden ${
                      module.status === "locked" ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                      onClick={() =>
                        setExpandedModule(expandedModule === module.id ? null : module.id)
                      }
                      disabled={module.status === "locked"}
                    >
                      {getStatusIcon(module.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.title}</h4>
                          {module.status === "completed" && (
                            <Badge variant="success" className="text-xs">Completed</Badge>
                          )}
                          {module.status === "in_progress" && (
                            <Badge variant="info" className="text-xs">In Progress</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{module.description}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {module.lessons.filter((l) => l.completed).length}/{module.lessons.length} lessons
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 transition-transform ${
                          expandedModule === module.id ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {expandedModule === module.id && (
                      <div className="border-t bg-muted/30 p-4">
                        {/* Lessons */}
                        <div className="space-y-2 mb-4">
                          <h5 className="text-sm font-medium text-muted-foreground mb-2">Lessons</h5>
                          {module.lessons.map((lesson) => (
                            <Link
                              key={lesson.id}
                              href={`/student/courses/${courseId}/learn/${lesson.id}`}
                              className="flex items-center gap-3 p-2 rounded hover:bg-background transition-colors"
                            >
                              {lesson.completed ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="p-1.5 rounded bg-muted">
                                {getLessonIcon(lesson.type)}
                              </div>
                              <span className="flex-1 text-sm">{lesson.title}</span>
                              <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Assignments */}
                        {module.assignments.length > 0 && (
                          <div className="space-y-2 pt-4 border-t">
                            <h5 className="text-sm font-medium text-muted-foreground mb-2">Assignments</h5>
                            {module.assignments.map((assignment) => (
                              <Link
                                key={assignment.id}
                                href={`/student/assignments/${assignment.id}`}
                                className="flex items-center justify-between p-2 rounded hover:bg-background transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded ${
                                    assignment.type === "quiz" ? "bg-primary/10 text-primary" :
                                    assignment.type === "written" ? "bg-info/10 text-info" :
                                    "bg-success/10 text-success"
                                  }`}>
                                    <ClipboardCheck className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm">{assignment.title}</span>
                                </div>
                                {assignment.score !== null ? (
                                  <Badge variant={
                                    (assignment.score / assignment.maxScore) >= 0.9 ? "success" :
                                    (assignment.score / assignment.maxScore) >= 0.7 ? "warning" :
                                    "destructive"
                                  }>
                                    {assignment.score}/{assignment.maxScore}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {assignment.dueDate}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>View and submit your assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.flatMap((m) => m.assignments).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/student/assignments/${assignment.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        assignment.type === "quiz" ? "bg-primary/10 text-primary" :
                        assignment.type === "written" ? "bg-info/10 text-info" :
                        "bg-success/10 text-success"
                      }`}>
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{assignment.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {assignment.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {assignment.maxScore} points
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {assignment.score !== null ? (
                        <Badge variant={
                          (assignment.score / assignment.maxScore) >= 0.9 ? "success" :
                          (assignment.score / assignment.maxScore) >= 0.7 ? "warning" :
                          "destructive"
                        }>
                          {assignment.score}/{assignment.maxScore}
                        </Badge>
                      ) : assignment.dueDate ? (
                        <div>
                          <p className="text-sm font-medium">Due: {assignment.dueDate}</p>
                          <Badge variant="warning">Not Started</Badge>
                        </div>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>My Grades</CardTitle>
              <CardDescription>View your performance in this course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold text-primary">91%</p>
                    <p className="text-sm text-muted-foreground">Current Grade</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold">3/6</p>
                    <p className="text-sm text-muted-foreground">Assignments Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold">A-</p>
                    <p className="text-sm text-muted-foreground">Letter Grade</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                {modules.flatMap((m) => m.assignments).filter((a) => a.score !== null).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{assignment.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        (assignment.score! / assignment.maxScore) >= 0.9 ? "text-success" :
                        (assignment.score! / assignment.maxScore) >= 0.7 ? "text-warning" :
                        "text-destructive"
                      }`}>
                        {assignment.score}/{assignment.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((assignment.score! / assignment.maxScore) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Course Resources</CardTitle>
              <CardDescription>Downloadable materials and references</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Course Syllabus", type: "PDF", size: "245 KB" },
                  { name: "EMT Skills Manual", type: "PDF", size: "2.4 MB" },
                  { name: "NREMT Practical Exam Guide", type: "PDF", size: "1.1 MB" },
                  { name: "Medical Terminology Reference", type: "PDF", size: "890 KB" },
                ].map((resource, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{resource.name}</p>
                        <p className="text-xs text-muted-foreground">{resource.type} - {resource.size}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useCourse } from "@/lib/hooks/use-courses";
import { useModules, useModule } from "@/lib/hooks/use-modules";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { useMySubmissions } from "@/lib/hooks/use-submissions";
import { useCourseProgress } from "@/lib/hooks/use-progress";

function getStatusIcon(isPublished: boolean) {
  if (isPublished) {
    return <CheckCircle className="h-5 w-5 text-success" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function getLessonIcon(type: string) {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  // Fetch real data using hooks
  const { course, isLoading: courseLoading } = useCourse(courseId);
  const { modules, isLoading: modulesLoading } = useModules(courseId);
  const { assignments, isLoading: assignmentsLoading } = useAssignments({ courseId });
  const { submissions } = useMySubmissions();
  const { progress } = useCourseProgress(courseId);

  const [expandedModule, setExpandedModule] = React.useState<string | null>(null);

  const isLoading = courseLoading || modulesLoading || assignmentsLoading;

  // Calculate stats
  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons_count || 0), 0);

  // Get submissions for this course's assignments
  const courseAssignmentIds = assignments.map(a => a.id);
  const courseSubmissions = submissions.filter(s =>
    s.assignment_id && courseAssignmentIds.includes(s.assignment_id)
  );

  // Calculate grade
  const gradedSubmissions = courseSubmissions.filter(s => s.final_score !== null);
  const averageGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.final_score || 0), 0) / gradedSubmissions.length)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
        <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or you're not enrolled.</p>
        <Button asChild>
          <Link href="/student/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

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
                  <Badge variant="info">{course.course_type}</Badge>
                  <Badge variant="success">In Progress</Badge>
                </div>
                <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
                <p className="text-muted-foreground max-w-2xl">{course.description || "No description provided."}</p>
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
              <p className="font-medium">{course.instructor?.full_name || "TBD"}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Progress</span>
              </div>
              <p className="text-2xl font-bold">{progress?.overallProgress || 0}%</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Modules</span>
              </div>
              <p className="text-2xl font-bold">{modules.length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Ends</span>
              </div>
              <p className="font-medium">
                {course.end_date ? format(new Date(course.end_date), "MMM d, yyyy") : "TBD"}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={progress?.overallProgress || 0} size="md" showValue />
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Course Content</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grades">My Grades</TabsTrigger>
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
              {modules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No modules available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.filter(m => m.is_published).map((module) => (
                    <div
                      key={module.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                        onClick={() =>
                          setExpandedModule(expandedModule === module.id ? null : module.id)
                        }
                      >
                        {getStatusIcon(module.is_published)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{module.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {module.description || "No description"}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {module.lessons_count || 0} lessons
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 transition-transform ${
                            expandedModule === module.id ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {expandedModule === module.id && (
                        <ModuleContent moduleId={module.id} courseId={courseId} />
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.filter(a => a.is_published).map((assignment) => {
                    const submission = courseSubmissions.find(s => s.assignment_id === assignment.id);
                    return (
                      <Link
                        key={assignment.id}
                        href={`/student/courses/${courseId}/assignments/${assignment.id}`}
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
                                {assignment.points_possible} points
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {submission?.final_score !== null && submission?.final_score !== undefined ? (
                            <Badge variant={
                              (submission.final_score / assignment.points_possible) >= 0.9 ? "success" :
                              (submission.final_score / assignment.points_possible) >= 0.7 ? "warning" :
                              "destructive"
                            }>
                              {submission.final_score}/{assignment.points_possible}
                            </Badge>
                          ) : submission?.status === "submitted" ? (
                            <Badge variant="info">Submitted</Badge>
                          ) : submission?.status === "in_progress" ? (
                            <Badge variant="warning">In Progress</Badge>
                          ) : assignment.due_date ? (
                            <div>
                              <p className="text-sm font-medium">
                                Due: {format(new Date(assignment.due_date), "MMM d")}
                              </p>
                              <Badge variant="secondary">Not Started</Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary">Not Started</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
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
                    <p className="text-4xl font-bold text-primary">
                      {averageGrade !== null ? `${averageGrade}%` : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Current Grade</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold">
                      {gradedSubmissions.length}/{assignments.filter(a => a.is_published).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Assignments Graded</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold">
                      {averageGrade !== null ? (
                        averageGrade >= 90 ? "A" :
                        averageGrade >= 80 ? "B" :
                        averageGrade >= 70 ? "C" :
                        averageGrade >= 60 ? "D" : "F"
                      ) : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Letter Grade</p>
                  </CardContent>
                </Card>
              </div>

              {gradedSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No graded assignments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gradedSubmissions.map((submission) => {
                    const assignment = assignments.find(a => a.id === submission.assignment_id);
                    if (!assignment) return null;
                    const percentage = Math.round((submission.final_score! / assignment.points_possible) * 100);
                    return (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{assignment.type}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            percentage >= 90 ? "text-success" :
                            percentage >= 70 ? "text-warning" :
                            "text-destructive"
                          }`}>
                            {submission.final_score}/{assignment.points_possible}
                          </p>
                          <p className="text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Separate component to load module content (lessons and assignments)
function ModuleContent({ moduleId, courseId }: { moduleId: string; courseId: string }) {
  const { module, isLoading } = useModule(moduleId);

  if (isLoading) {
    return (
      <div className="border-t bg-muted/30 p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) return null;

  return (
    <div className="border-t bg-muted/30 p-4">
      {/* Lessons */}
      {module.lessons && module.lessons.length > 0 && (
        <div className="space-y-2 mb-4">
          <h5 className="text-sm font-medium text-muted-foreground mb-2">Lessons</h5>
          {module.lessons.filter(l => l.is_published).map((lesson) => (
            <Link
              key={lesson.id}
              href={`/student/courses/${courseId}/learn/${lesson.id}`}
              className="flex items-center gap-3 p-2 rounded hover:bg-background transition-colors"
            >
              <Circle className="h-4 w-4 text-muted-foreground" />
              <div className="p-1.5 rounded bg-muted">
                {getLessonIcon(lesson.content_type)}
              </div>
              <span className="flex-1 text-sm">{lesson.title}</span>
              {lesson.duration_minutes && (
                <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Assignments */}
      {module.assignments && module.assignments.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <h5 className="text-sm font-medium text-muted-foreground mb-2">Assignments</h5>
          {module.assignments.filter(a => a.is_published).map((assignment) => (
            <Link
              key={assignment.id}
              href={`/student/courses/${courseId}/assignments/${assignment.id}`}
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
              {assignment.due_date && (
                <span className="text-xs text-muted-foreground">
                  Due: {format(new Date(assignment.due_date), "MMM d")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {(!module.lessons || module.lessons.length === 0) && (!module.assignments || module.assignments.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No content in this module yet.</p>
      )}
    </div>
  );
}

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
  Loader2,
} from "lucide-react";
import { useCourse } from "@/lib/hooks/use-courses";
import { useModules, useCreateModule, useUpdateModule, useDeleteModule } from "@/lib/hooks/use-modules";
import { useLessons, useCreateLesson, useUpdateLesson, useDeleteLesson } from "@/lib/hooks/use-lessons";
import { useCourseEnrollments } from "@/lib/hooks/use-enrollments";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { useSubmissions } from "@/lib/hooks/use-submissions";
import { ModuleForm } from "@/components/course/module-form";
import { LessonEditor } from "@/components/course/lesson-editor";

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

function getModuleIcon(isPublished: boolean | null) {
  if (isPublished) {
    return <CheckCircle className="h-5 w-5 text-success" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function getLessonIcon(contentType: string | null) {
  switch (contentType) {
    case "video":
      return <Video className="h-4 w-4 text-primary" />;
    case "document":
      return <FileText className="h-4 w-4 text-info" />;
    case "embed":
      return <Play className="h-4 w-4 text-success" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

interface ModuleCardProps {
  module: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: any) => void;
  onDeleteLesson: (lessonId: string) => void;
}

function ModuleCard({
  module,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: ModuleCardProps) {
  const { data: lessons = [], isLoading: lessonsLoading } = useLessons(isExpanded ? module.id : "");

  return (
    <div className="rounded-lg border">
      {/* Module Header */}
      <div
        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
          {(module.order_index ?? 0) + 1}
        </div>
        {getModuleIcon(module.is_published)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{module.title}</h4>
            {module.is_published ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{module.description || "No description"}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <File className="h-3 w-3" />
              {module.lessons_count || 0} lessons
            </span>
            <span className="flex items-center gap-1">
              <ClipboardCheck className="h-3 w-3" />
              {module.assignments_count || 0} assignments
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
          <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>
      </div>

      {/* Lessons Section (Expanded) */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium">Lessons</h5>
            <Button variant="outline" size="sm" onClick={onAddLesson}>
              <Plus className="h-3 w-3 mr-1" />
              Add Lesson
            </Button>
          </div>

          {lessonsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No lessons yet. Add your first lesson to this module.
            </p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson: any) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs">
                    {(lesson.order_index ?? 0) + 1}
                  </div>
                  {getLessonIcon(lesson.content_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{lesson.title}</span>
                      {!lesson.is_published && (
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{lesson.content_type || "text"}</span>
                      {lesson.duration_minutes && (
                        <>
                          <span>•</span>
                          <span>{lesson.duration_minutes} min</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEditLesson(lesson)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLesson(lesson.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  // Fetch real data using hooks
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);
  const { mutateAsync: createModule } = useCreateModule();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useCourseEnrollments(courseId);
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments({
    courseId,
    includeUnpublished: true
  });
  const { data: submissions = [] } = useSubmissions({});

  // Module mutations
  const { mutateAsync: updateModule } = useUpdateModule();
  const { mutateAsync: deleteModule } = useDeleteModule();

  // Lesson mutations - will be used when a module is expanded
  const { mutateAsync: createLesson } = useCreateLesson();
  const { mutateAsync: updateLesson } = useUpdateLesson();
  const { mutateAsync: deleteLesson } = useDeleteLesson();

  // Modal state
  const [isModuleFormOpen, setIsModuleFormOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<typeof modules[0] | null>(null);
  const [isLessonEditorOpen, setIsLessonEditorOpen] = React.useState(false);
  const [editingLesson, setEditingLesson] = React.useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = React.useState<string | null>(null);

  const isLoading = courseLoading || modulesLoading || enrollmentsLoading || assignmentsLoading;

  // Filter submissions for this course's assignments
  const courseAssignmentIds = assignments.map(a => a.id);
  const courseSubmissions = submissions.filter(s =>
    s.assignment_id && courseAssignmentIds.includes(s.assignment_id)
  );

  // Calculate stats
  const studentsCount = enrollments.filter(e => e.status === "active").length;
  const maxStudents = course?.max_students || 0;

  // Get students with low progress
  const atRiskStudents = enrollments
    .filter(e => e.status === "active" && (e.completion_percentage || 0) < 50)
    .slice(0, 3);

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
        <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/instructor/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  // Module handlers
  const handleAddModule = () => {
    setEditingModule(null);
    setIsModuleFormOpen(true);
  };

  const handleEditModule = (module: typeof modules[0]) => {
    setEditingModule(module);
    setIsModuleFormOpen(true);
  };

  const handleModuleSubmit = async (data: {
    title: string;
    description: string;
    unlock_date: string;
    is_published: boolean;
  }) => {
    if (editingModule) {
      await updateModule({
        moduleId: editingModule.id,
        data: {
          title: data.title,
          description: data.description,
          unlock_date: data.unlock_date || undefined,
          is_published: data.is_published,
        },
      });
    } else {
      await createModule({
        courseId,
        data: {
          title: data.title,
          description: data.description,
          unlock_date: data.unlock_date || undefined,
          is_published: data.is_published,
        },
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("Are you sure you want to delete this module? All lessons will also be deleted.")) {
      await deleteModule(moduleId);
    }
  };

  // Lesson handlers
  const handleAddLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setIsLessonEditorOpen(true);
  };

  const handleEditLesson = (lesson: any, moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(lesson);
    setIsLessonEditorOpen(true);
  };

  const handleLessonSubmit = async (data: {
    title: string;
    content_type: "video" | "document" | "text" | "embed";
    content: string;
    video_url: string;
    document_url: string;
    duration_minutes: number | null;
    is_published: boolean;
  }) => {
    if (!selectedModuleId) return;

    if (editingLesson) {
      await updateLesson({
        lessonId: editingLesson.id,
        data: {
          title: data.title,
          content_type: data.content_type,
          content: data.content || undefined,
          video_url: data.video_url || undefined,
          document_url: data.document_url || undefined,
          duration_minutes: data.duration_minutes ?? undefined,
          is_published: data.is_published,
        },
      });
    } else {
      await createLesson({
        moduleId: selectedModuleId,
        data: {
          title: data.title,
          content_type: data.content_type,
          content: data.content || undefined,
          video_url: data.video_url || undefined,
          document_url: data.document_url || undefined,
          duration_minutes: data.duration_minutes ?? undefined,
          is_published: data.is_published,
        },
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      await deleteLesson(lessonId);
    }
  };

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
                  <Badge variant="info">{course.course_type}</Badge>
                  <Badge variant="success">{course.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
                <p className="text-muted-foreground max-w-2xl">{course.description || "No description provided."}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button asChild>
                <Link href={`/instructor/courses/${courseId}/assignments/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Link>
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
              <p className="text-2xl font-bold">{studentsCount}{maxStudents > 0 ? `/${maxStudents}` : ""}</p>
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
                <ClipboardCheck className="h-4 w-4" />
                <span className="text-sm">Assignments</span>
              </div>
              <p className="text-2xl font-bold">{assignments.length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Enrollment Code</span>
              </div>
              <p className="text-xl font-mono font-bold">{course.enrollment_code}</p>
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
                  <CardTitle>Course Modules</CardTitle>
                  <CardDescription>{modules.length} modules in this course</CardDescription>
                </CardHeader>
                <CardContent>
                  {modules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No modules yet. Add your first module to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modules.slice(0, 4).map((module) => (
                        <div key={module.id} className="flex items-center gap-4 p-3 rounded-lg border">
                          {getModuleIcon(module.is_published)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">{module.title}</h4>
                              {module.is_published ? (
                                <Badge variant="success">Published</Badge>
                              ) : (
                                <Badge variant="secondary">Draft</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{module.lessons_count || 0} lessons</span>
                              <span>{module.assignments_count || 0} assignments</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {modules.length > 0 && (
                    <Button variant="ghost" className="w-full mt-4" asChild>
                      <Link href={`/instructor/courses/${courseId}/modules`}>
                        View All Modules <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
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
                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No assignments yet. Create your first assignment.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.slice(0, 3).map((assignment) => (
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
                              <p className="text-xs text-muted-foreground">
                                {assignment.due_date ? `Due: ${format(new Date(assignment.due_date), "MMM d, yyyy")}` : "No due date"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{assignment.submissions_count || 0}/{studentsCount}</p>
                            <p className="text-xs text-muted-foreground">submissions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignments.filter(a => a.due_date && new Date(a.due_date) > new Date()).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming deadlines
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {assignments
                        .filter(a => a.due_date && new Date(a.due_date) > new Date())
                        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                        .slice(0, 3)
                        .map((assignment) => (
                          <div key={assignment.id} className="flex items-start gap-3">
                            <div className="p-1.5 rounded bg-warning/10 text-warning">
                              <Clock className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {format(new Date(assignment.due_date!), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
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
                  {atRiskStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All students on track!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {atRiskStudents.map((enrollment) => (
                        <div key={enrollment.id} className="flex items-center gap-3">
                          <Avatar fallback={enrollment.student?.full_name || "Student"} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{enrollment.student?.full_name || "Unknown Student"}</p>
                            <p className="text-xs text-muted-foreground">{enrollment.completion_percentage || 0}% complete</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {studentsCount > 0 && (
                    <Button variant="ghost" size="sm" className="w-full mt-3">
                      View All Students
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Course Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {course.start_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span className="font-medium">{format(new Date(course.start_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {course.end_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">{format(new Date(course.end_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {course.course_code && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Course Code</span>
                        <span className="font-medium">{course.course_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Lessons</span>
                      <span className="font-medium">{modules.reduce((sum, m) => sum + (m.lessons_count || 0), 0)}</span>
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
              <Button onClick={handleAddModule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No modules yet. Add your first module to structure your course.</p>
                  <Button variant="outline" className="mt-4" onClick={handleAddModule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Module
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      isExpanded={expandedModuleId === module.id}
                      onToggleExpand={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
                      onEdit={() => handleEditModule(module)}
                      onDelete={() => handleDeleteModule(module.id)}
                      onAddLesson={() => handleAddLesson(module.id)}
                      onEditLesson={(lesson) => handleEditLesson(lesson, module.id)}
                      onDeleteLesson={handleDeleteLesson}
                    />
                  ))}
                </div>
              )}
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
              <Button asChild>
                <Link href={`/instructor/courses/${courseId}/assignments/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments yet. Create your first assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
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
                              {(assignment.type || 'quiz').charAt(0).toUpperCase() + (assignment.type || 'quiz').slice(1)}
                            </Badge>
                            <span>
                              {assignment.due_date ? `Due: ${format(new Date(assignment.due_date), "MMM d, yyyy")}` : "No due date"}
                            </span>
                            {!assignment.is_published && <Badge variant="outline">Draft</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium">{assignment.submissions_count || 0}/{studentsCount}</p>
                          <p className="text-xs text-muted-foreground">submitted</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{assignment.points_possible}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>{studentsCount} students enrolled</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Search students..." className="w-[250px]" />
                <Button variant="outline">
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled yet.</p>
                  <p className="text-sm mt-2">Share the enrollment code <strong>{course.enrollment_code}</strong> with students.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar fallback={enrollment.student?.full_name || "Student"} size="md" />
                        <div>
                          <h4 className="font-medium">{enrollment.student?.full_name || "Unknown Student"}</h4>
                          <p className="text-sm text-muted-foreground">{enrollment.student?.email || ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="w-32">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{enrollment.completion_percentage || 0}%</span>
                          </div>
                          <Progress value={enrollment.completion_percentage || 0} size="sm" />
                        </div>
                        <div className="text-right w-20">
                          <Badge variant={
                            enrollment.status === "active" ? "success" :
                            enrollment.status === "completed" ? "info" :
                            "secondary"
                          }>
                            {enrollment.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Module Form Modal */}
      <ModuleForm
        isOpen={isModuleFormOpen}
        onClose={() => {
          setIsModuleFormOpen(false);
          setEditingModule(null);
        }}
        onSubmit={handleModuleSubmit}
        initialData={editingModule ? {
          title: editingModule.title,
          description: editingModule.description || "",
          unlock_date: editingModule.unlock_date || "",
          is_published: editingModule.is_published || false,
        } : undefined}
        isEditing={!!editingModule}
      />

      {/* Lesson Editor Modal */}
      <LessonEditor
        isOpen={isLessonEditorOpen}
        onClose={() => {
          setIsLessonEditorOpen(false);
          setEditingLesson(null);
          setSelectedModuleId(null);
        }}
        onSubmit={handleLessonSubmit}
        initialData={editingLesson ? {
          title: editingLesson.title,
          content_type: editingLesson.content_type || "text",
          content: editingLesson.content || "",
          video_url: editingLesson.video_url || "",
          document_url: editingLesson.document_url || "",
          duration_minutes: editingLesson.duration_minutes || null,
          is_published: editingLesson.is_published || false,
        } : undefined}
        isEditing={!!editingLesson}
      />
    </div>
  );
}

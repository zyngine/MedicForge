"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Spinner,
  Alert,
  Modal,
  ModalFooter,
} from "@/components/ui";
import {
  ArrowLeft,
  Library,
  BookOpen,
  Copy,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  HelpCircle,
  ClipboardList,
  MessageSquare,
  Award,
  Layers,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  useCoursePreview,
  useCloneCourse,
  formatCloneCount,
  type CoursePreviewModule,
} from "@/lib/hooks/use-shared-courses";

// Lesson type icons
const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  document: FileText,
  reading: FileText,
  quiz: HelpCircle,
  assignment: ClipboardList,
  discussion: MessageSquare,
};

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const { data: course, isLoading, error } = useCoursePreview(courseId);
  const cloneMutation = useCloneCourse();

  const [showCloneModal, setShowCloneModal] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!course) return;
    setExpandedModules(new Set(course.modules.map((m) => m.module_id)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const handleClone = async () => {
    try {
      const newCourseId = await cloneMutation.mutateAsync({
        sourceCourseId: courseId,
        newTitle: newTitle || undefined,
      });
      setShowCloneModal(false);
      router.push(`/instructor/courses/${newCourseId}`);
    } catch (error) {
      console.error("Failed to clone course:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        <Link href="/admin/courses/library">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
        <Alert variant="error">
          <p>Course not found or is no longer shared.</p>
        </Alert>
      </div>
    );
  }

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/admin/courses/library">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {course.is_official && (
              <Badge variant="warning">
                <Award className="h-3 w-3 mr-1" />
                Official Course
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{course.course_title}</h1>
          <p className="text-muted-foreground mt-1">
            By {course.tenant_name || "Unknown"}
          </p>
        </div>
        <Button size="lg" onClick={() => setShowCloneModal(true)}>
          <Copy className="h-5 w-5 mr-2" />
          Clone This Course
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {course.share_description || course.course_description || "No description provided."}
              </p>
              {course.share_tags && course.share_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {course.share_tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Structure */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Structure</CardTitle>
                  <CardDescription>
                    {course.modules.length} modules, {totalLessons} lessons
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {course.modules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No modules in this course
                </p>
              ) : (
                <div className="space-y-2">
                  {course.modules.map((module, index) => (
                    <ModuleItem
                      key={module.module_id}
                      module={module}
                      index={index}
                      isExpanded={expandedModules.has(module.module_id)}
                      onToggle={() => toggleModule(module.module_id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modules</span>
                <span className="font-medium">{course.modules.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lessons</span>
                <span className="font-medium">{totalLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Times Cloned</span>
                <span className="font-medium">{course.clone_count}</span>
              </div>
            </CardContent>
          </Card>

          {/* Clone CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Copy className="h-10 w-10 mx-auto text-primary mb-3" />
              <h3 className="font-semibold mb-2">Clone This Course</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a copy of this course in your organization. You can customize it after cloning.
              </p>
              <Button className="w-full" onClick={() => setShowCloneModal(true)}>
                Clone Course
              </Button>
            </CardContent>
          </Card>

          {/* What You Get */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What You Get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  All modules and lessons
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Lesson content and materials
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Full editing capabilities
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4 text-center">-</span>
                  Student data not included
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clone Modal */}
      <Modal
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        title="Clone Course"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Create a copy of &quot;{course.course_title}&quot; in your organization.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Course Title (optional)</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`${course.course_title} (Copy)`}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default title
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">This will clone:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- {course.modules.length} modules</li>
              <li>- {totalLessons} lessons with content</li>
              <li>- Course settings and structure</li>
            </ul>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCloneModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} isLoading={cloneMutation.isPending}>
              <Copy className="h-4 w-4 mr-2" />
              Clone Course
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

function ModuleItem({
  module,
  index,
  isExpanded,
  onToggle,
}: {
  module: CoursePreviewModule;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <div>
            <p className="font-medium">{module.module_title}</p>
            <p className="text-sm text-muted-foreground">
              {module.lessons.length} lesson{module.lessons.length !== 1 && "s"}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && module.lessons.length > 0 && (
        <div className="border-t bg-muted/20">
          {module.lessons.map((lesson) => {
            const Icon = LESSON_ICONS[lesson.lesson_type] || BookOpen;
            return (
              <div
                key={lesson.lesson_id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lesson.lesson_title}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {lesson.lesson_type}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  Video,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLesson, useLessons } from "@/lib/hooks/use-lessons";
import { LessonAttachmentsView } from "@/components/course/lesson-attachments-view";
import {
  useLessonProgress,
  useMarkLessonComplete,
  useMarkLessonIncomplete,
} from "@/lib/hooks/use-progress";
import { useCourse } from "@/lib/hooks/use-courses";

function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "data-blocked:");
}

function getLessonIcon(type: string) {
  switch (type) {
    case "video":
      return <Video className="h-5 w-5" />;
    case "document":
      return <FileText className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
}

export default function StudentLessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId);
  const { data: _course } = useCourse(courseId);
  const { data: progress, isLoading: progressLoading } = useLessonProgress(lessonId);
  const { mutate: markComplete, isPending: isMarkingComplete } = useMarkLessonComplete();
  const { mutate: markIncomplete, isPending: isMarkingIncomplete } = useMarkLessonIncomplete();

  // Get sibling lessons for navigation
  const moduleId = lesson?.module_id;
  const { data: moduleLessons = [] } = useLessons(moduleId);

  const isCompleted = !!progress?.completed_at;
  const isLoading = lessonLoading || progressLoading;

  // Find current lesson index and navigation
  const currentIndex = moduleLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? moduleLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null;

  const handleToggleComplete = () => {
    if (isCompleted) {
      markIncomplete(lessonId);
    } else {
      markComplete(lessonId);
    }
  };

  const handleNext = () => {
    if (nextLesson) {
      router.push(`/student/courses/${courseId}/learn/${nextLesson.id}`);
    }
  };

  const handlePrev = () => {
    if (prevLesson) {
      router.push(`/student/courses/${courseId}/learn/${prevLesson.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Lesson not found</h3>
        <p className="text-muted-foreground mb-4">This lesson may have been removed.</p>
        <Button asChild>
          <Link href={`/student/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/student/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
        </div>
        <Badge variant={isCompleted ? "success" : "secondary"}>
          {isCompleted ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </>
          ) : (
            <>
              <Circle className="h-3 w-3 mr-1" />
              In Progress
            </>
          )}
        </Badge>
      </div>

      {/* Lesson Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              lesson.content_type === "video"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            }`}>
              {getLessonIcon(lesson.content_type || "text")}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="capitalize">
                  {lesson.content_type}
                </Badge>
                {lesson.duration_minutes && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration_minutes} min
                  </span>
                )}
              </div>
              <CardTitle className="text-xl">{lesson.title}</CardTitle>
              {lesson.module && (
                <p className="text-sm text-muted-foreground mt-1">
                  Module: {lesson.module.title}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lesson Content */}
      <Card>
        <CardContent className="p-6">
          {/* Video Content */}
          {lesson.content_type === "video" && lesson.video_url && (
            <div className="mb-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {lesson.video_url.includes("youtube.com") || lesson.video_url.includes("youtu.be") ? (
                  <iframe
                    className="w-full h-full"
                    src={lesson.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : lesson.video_url.includes("vimeo.com") ? (
                  <iframe
                    className="w-full h-full"
                    src={lesson.video_url.replace("vimeo.com/", "player.vimeo.com/video/")}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="w-full h-full"
                    controls
                    src={lesson.video_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            </div>
          )}

          {/* Document Content */}
          {lesson.content_type === "document" && lesson.document_url && (
            <div className="mb-6">
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Course Document</p>
                      <p className="text-sm text-muted-foreground">
                        Click to view or download
                      </p>
                    </div>
                  </div>
                  <Button asChild>
                    <a href={lesson.document_url} target="_blank" rel="noopener noreferrer">
                      Open Document
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Text/HTML Content */}
          {lesson.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {typeof lesson.content === "string" ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(lesson.content || "") }} />
              ) : typeof lesson.content === "object" && lesson.content !== null && "html" in lesson.content ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(String((lesson.content as { html: string }).html)) }} />
              ) : typeof lesson.content === "object" && lesson.content !== null && "text" in lesson.content ? (
                <p className="whitespace-pre-wrap">{String((lesson.content as { text: string }).text)}</p>
              ) : (
                <p className="text-muted-foreground">No content available.</p>
              )}
            </div>
          )}

          {/* Empty state */}
          {!lesson.content && !lesson.video_url && !lesson.document_url && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content has been added to this lesson yet.</p>
            </div>
          )}

          {/* Attachments (PowerPoint, PDF, video, etc.) */}
          <LessonAttachmentsView lessonId={lessonId} />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={!prevLesson}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Lesson
            </Button>

            <Button
              variant={isCompleted ? "outline" : "default"}
              onClick={handleToggleComplete}
              disabled={isMarkingComplete || isMarkingIncomplete}
            >
              {isMarkingComplete || isMarkingIncomplete ? (
                <Spinner size="sm" className="mr-2" />
              ) : isCompleted ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Circle className="h-4 w-4 mr-2" />
              )}
              {isCompleted ? "Mark Incomplete" : "Mark Complete"}
            </Button>

            <Button
              variant={nextLesson ? "default" : "outline"}
              onClick={handleNext}
              disabled={!nextLesson}
            >
              Next Lesson
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Navigation */}
      {moduleLessons.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lessons in this Module</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {moduleLessons.filter(l => l.is_published).map((l, index) => (
                <Link
                  key={l.id}
                  href={`/student/courses/${courseId}/learn/${l.id}`}
                  className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
                    l.id === lessonId ? "bg-muted" : ""
                  }`}
                >
                  <span className="text-sm text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <div className="p-1.5 rounded bg-muted">
                    {getLessonIcon(l.content_type || "text")}
                  </div>
                  <span className={`flex-1 text-sm ${l.id === lessonId ? "font-medium" : ""}`}>
                    {l.title}
                  </span>
                  {l.duration_minutes && (
                    <span className="text-xs text-muted-foreground">
                      {l.duration_minutes} min
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

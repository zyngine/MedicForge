"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  Spinner,
  Select,
  Textarea,
} from "@/components/ui";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { useCreateThread } from "@/lib/hooks/use-discussions";

export default function NewDiscussionPage() {
  const router = useRouter();
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useMyEnrollments();
  const { mutateAsync: createThread, isPending: isSubmitting } = useCreateThread();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Get active enrollments with course data
  const courses = enrollments
    .filter((e) => e.status === "active" && e.course)
    .map((e) => ({
      id: e.course!.id,
      title: e.course!.title,
    }));

  // Auto-select first course
  useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses, selectedCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !selectedCourse) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);

    try {
      const thread = await createThread({
        courseId: selectedCourse,
        title: title.trim(),
        content: content.trim(),
      });

      router.push(`/student/discussions/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create discussion");
    }
  };

  if (isLoadingEnrollments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discussions
        </Button>

        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Courses Available</h3>
            <p className="text-muted-foreground">
              You need to be enrolled in a course to start a discussion.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Discussions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Start a New Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="course" required>
                Course
              </Label>
              <Select
                id="course"
                value={selectedCourse}
                onChange={(value) => setSelectedCourse(value)}
                placeholder="Select a course"
                options={courses.map((course) => ({
                  value: course.id,
                  label: course.title,
                }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" required>
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question or topic?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" required>
                Content
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Provide details about your question or start the discussion..."
                className="min-h-[200px] resize-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                Post Discussion
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

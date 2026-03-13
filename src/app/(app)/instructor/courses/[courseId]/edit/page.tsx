"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Select,
} from "@/components/ui";
import { ArrowLeft, BookOpen, Loader2, Save } from "lucide-react";
import { useCourse, useUpdateCourse } from "@/lib/hooks/use-courses";
import type { CourseForm } from "@/types";

const courseTypes = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
  { value: "Custom", label: "Custom Course" },
];

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { data: course, isLoading } = useCourse(courseId);
  const { mutateAsync: updateCourse, isPending: isSaving } = useUpdateCourse();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [formData, setFormData] = React.useState<CourseForm>({
    title: "",
    description: "",
    courseCode: "",
    courseType: "EMT",
    startDate: "",
    endDate: "",
    maxStudents: 30,
  });

  // Populate form once course loads
  React.useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || "",
        description: course.description || "",
        courseCode: course.course_code || "",
        courseType: (course.course_type as CourseForm["courseType"]) || "EMT",
        startDate: course.start_date ? course.start_date.slice(0, 10) : "",
        endDate: course.end_date ? course.end_date.slice(0, 10) : "",
        maxStudents: course.max_students ?? 30,
      });
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.title.trim()) {
      setError("Course title is required");
      return;
    }

    try {
      await updateCourse({
        courseId,
        updates: {
          title: formData.title,
          description: formData.description || null,
          course_code: formData.courseCode || null,
          course_type: formData.courseType as "EMR" | "EMT" | "AEMT" | "Paramedic" | "Custom",
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          max_students: formData.maxStudents || null,
        },
      });
      setSuccess(true);
      setTimeout(() => router.push(`/instructor/courses/${courseId}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/instructor/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Course Settings</h1>
        <p className="text-muted-foreground">
          Update the details for <span className="font-medium">{course?.title}</span>.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-error/10 text-error text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md bg-success/10 text-success text-sm">
                Changes saved. Redirecting…
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" required>Course Title</Label>
              <Input
                id="title"
                placeholder="e.g., EMT Basic - Spring 2024"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                leftIcon={<BookOpen className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseType" required>Course Type</Label>
              <Select
                id="courseType"
                options={courseTypes}
                value={formData.courseType}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, courseType: value as CourseForm["courseType"] }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                placeholder="e.g., EMT-101"
                value={formData.courseCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, courseCode: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn in this course..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStudents">Maximum Students</Label>
              <Input
                id="maxStudents"
                type="number"
                min={1}
                max={500}
                value={formData.maxStudents || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxStudents: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Leave empty for unlimited enrollment.</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" asChild>
                <Link href={`/instructor/courses/${courseId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

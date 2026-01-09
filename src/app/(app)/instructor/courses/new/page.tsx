"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import type { CourseForm } from "@/types";

const courseTypes = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
  { value: "Custom", label: "Custom Course" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const { createCourse } = useInstructorCourses();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<CourseForm>({
    title: "",
    description: "",
    courseCode: "",
    courseType: "EMT",
    startDate: "",
    endDate: "",
    maxStudents: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Course title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const course = await createCourse(formData);
      if (course) {
        router.push(`/instructor/courses/${course.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/instructor/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Create New Course</h1>
        <p className="text-muted-foreground">
          Set up a new course for your students. An enrollment code will be automatically generated.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-error/10 text-error text-sm">
                {error}
              </div>
            )}

            {/* Course Title */}
            <div className="space-y-2">
              <Label htmlFor="title" required>
                Course Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., EMT Basic - Spring 2024"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                leftIcon={<BookOpen className="h-4 w-4" />}
              />
            </div>

            {/* Course Type */}
            <div className="space-y-2">
              <Label htmlFor="courseType" required>
                Course Type
              </Label>
              <Select
                id="courseType"
                options={courseTypes}
                value={formData.courseType}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    courseType: value as CourseForm["courseType"],
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                This determines the NREMT skill requirements for the course.
              </p>
            </div>

            {/* Course Code */}
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code (Optional)</Label>
              <Input
                id="courseCode"
                placeholder="e.g., EMT-101"
                value={formData.courseCode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, courseCode: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                An optional identifier for internal tracking.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn in this course..."
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Max Students */}
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
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited enrollment.
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h4 className="font-medium text-sm mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>A unique enrollment code will be generated automatically</li>
                <li>You can add modules, lessons, and assignments after creation</li>
                <li>Share the enrollment code with students to let them join</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/instructor/courses">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

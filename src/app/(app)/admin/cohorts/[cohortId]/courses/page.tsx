"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Spinner,
  Alert,
  Badge,
} from "@/components/ui";
import { ArrowLeft, Search, BookOpen, Plus, Trash2 } from "lucide-react";
import { useCohort, useCohortCourses } from "@/lib/hooks/use-cohorts";
import { useCourses } from "@/lib/hooks/use-courses";
import { formatDate } from "@/lib/utils";

export default function CohortCoursesPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.cohortId as string;

  const { cohort, isLoading: cohortLoading } = useCohort(cohortId);
  const {
    courses: enrolledCourses,
    isLoading: enrolledLoading,
    enrollInCourse,
    unenrollFromCourse,
    isEnrolling,
  } = useCohortCourses(cohortId);
  const { data: allCourses = [], isLoading: coursesLoading } = useCourses();

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((c) => c.course_id)),
    [enrolledCourses],
  );

  const available = useMemo(() => {
    return allCourses.filter((c) => !enrolledCourseIds.has(c.id));
  }, [allCourses, enrolledCourseIds]);

  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.course_type || "").toLowerCase().includes(q),
    );
  }, [available, search]);

  const handleEnroll = async (courseId: string) => {
    setError(null);
    setBusyId(courseId);
    try {
      await enrollInCourse(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll cohort in course");
    } finally {
      setBusyId(null);
    }
  };

  const handleUnenroll = async (cohortCourseId: string, courseTitle: string) => {
    if (!confirm(`Remove "${courseTitle}" from this cohort? Students already enrolled in the course keep their enrollment.`)) {
      return;
    }
    setError(null);
    setBusyId(cohortCourseId);
    try {
      await unenrollFromCourse(cohortCourseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    } finally {
      setBusyId(null);
    }
  };

  const isLoading = cohortLoading || enrolledLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">Cohort not found.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/cohorts">Back to cohorts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/admin/cohorts/${cohortId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {cohort.name}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Manage Courses for {cohort.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Link courses to this cohort. Members can then be batch-enrolled from the cohort dashboard.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Enrolled */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cohort courses ({enrolledCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No courses linked yet. Add courses from the list below.
            </p>
          ) : (
            <div className="divide-y">
              {enrolledCourses.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cc.course?.title || "Untitled course"}</p>
                      <p className="text-xs text-muted-foreground">
                        {cc.course?.course_type || "Custom"} · linked {formatDate(cc.enrolled_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === cc.id}
                    onClick={() => handleUnenroll(cc.id, cc.course?.title || "this course")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Available courses ({available.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="pl-9"
            />
          </div>

          {filteredAvailable.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8 text-center">
              {available.length === 0
                ? "Every course in your organization is already linked to this cohort."
                : "No courses match your search."}
            </p>
          ) : (
            <div className="divide-y border rounded-lg">
              {filteredAvailable.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      {c.course_type && (
                        <Badge variant="secondary" className="mt-0.5 text-xs">
                          {c.course_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={busyId === c.id || isEnrolling}
                    onClick={() => handleEnroll(c.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => router.push(`/admin/cohorts/${cohortId}`)}>
          Done
        </Button>
      </div>
    </div>
  );
}

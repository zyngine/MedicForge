"use client";

import * as React from "react";
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
  Label,
  Select,
  Spinner,
  Alert,
} from "@/components/ui";
import { Activity, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useCourseVitalsRoster } from "@/lib/hooks/use-vital-signs";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { formatDate } from "@/lib/utils";

export default function InstructorVitalsRosterPage() {
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses();
  const [courseId, setCourseId] = React.useState("");

  // Default to the first course once they load, so the page is not empty on arrival.
  React.useEffect(() => {
    if (!courseId && courses.length > 0) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const { data: roster = [], isLoading, error, refetch } = useCourseVitalsRoster(courseId || null);

  const selected = courses.find((c) => c.id === courseId);
  const required = roster[0]?.required_total ?? null;
  const met = roster.filter((r) => required != null && r.logged_total >= required).length;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/instructor/clinical">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Clinical
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Vital Signs Progress</h1>
        <p className="text-muted-foreground">
          Documented sets per student, counting both their own log and the sets inside their
          patient contact reports.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="max-w-md space-y-2">
            <Label>Course</Label>
            {coursesLoading ? (
              <Spinner size="sm" />
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no courses yet.</p>
            ) : (
              <Select
                value={courseId}
                onChange={setCourseId}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {courseId && required == null && !isLoading && roster.length > 0 && (
        <Alert variant="info">
          {selected?.title ?? "This course"} has no vital signs requirement set, so there is
          nothing to measure progress against. Set one on the course to turn these counts into
          a target.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Roster
          </CardTitle>
          <CardDescription>
            {required != null
              ? `${met} of ${roster.length} student${roster.length === 1 ? "" : "s"} have met the ${required}-set requirement.`
              : "Students furthest behind appear first once a requirement is set."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
              <p className="text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : roster.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No students enrolled</h3>
              <p className="text-muted-foreground">
                Nobody is actively enrolled in this course yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Progress</th>
                    <th className="text-right py-3 px-4 font-medium">Own log</th>
                    <th className="text-right py-3 px-4 font-medium">From contacts</th>
                    <th className="text-right py-3 px-4 font-medium">Total</th>
                    <th className="text-left py-3 px-4 font-medium">Last logged</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => {
                    const isComplete = required != null && row.logged_total >= required;
                    const pct =
                      required && required > 0
                        ? Math.min((row.logged_total / required) * 100, 100)
                        : 0;

                    return (
                      <tr key={row.student_id} className="border-b last:border-0">
                        <td className="py-3 px-4">
                          <p className="font-medium">{row.full_name}</p>
                          <p className="text-sm text-muted-foreground">{row.email}</p>
                        </td>
                        <td className="py-3 px-4 min-w-[180px]">
                          {required != null ? (
                            <div className="space-y-1">
                              <Progress
                                value={pct}
                                size="sm"
                                variant={isComplete ? "success" : "default"}
                              />
                              {isComplete ? (
                                <Badge variant="success" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {row.remaining} to go
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No target set</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{row.logged_standalone}</td>
                        <td className="py-3 px-4 text-right">
                          {row.logged_in_patient_contacts}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{row.logged_total}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {row.last_logged_at ? formatDate(row.last_logged_at) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

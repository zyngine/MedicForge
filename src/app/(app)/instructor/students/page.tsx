"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Input,
  Avatar,
  Progress,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Users,
  Search,
  Mail,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Download,
  Filter,
} from "lucide-react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useCourseEnrollments } from "@/lib/hooks/use-enrollments";
import { formatDate } from "@/lib/utils";

export default function InstructorStudentsPage() {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Fetch enrollments for selected course (or first course)
  const courseId = selectedCourse || courses[0]?.id || "";
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useCourseEnrollments(courseId);

  const isLoading = coursesLoading || enrollmentsLoading;

  // Filter students
  const filteredStudents = React.useMemo(() => {
    let result = enrollments;

    if (searchTerm) {
      result = result.filter(
        (e) =>
          e.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    return result;
  }, [enrollments, searchTerm, statusFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const active = enrollments.filter((e) => e.status === "active").length;
    const atRisk = enrollments.filter(
      (e) => (e.completion_percentage || 0) < 50 && e.status === "active"
    ).length;
    const avgProgress =
      enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) /
          enrollments.length
        : 0;

    return { total: enrollments.length, active, atRisk, avgProgress };
  }, [enrollments]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Students
          </h1>
          <p className="text-muted-foreground">
            Manage and track your students across courses
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Roster
        </Button>
      </div>

      {/* Course Selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={selectedCourse || courseId}
          onChange={setSelectedCourse}
          options={courses.map((course) => ({
            value: course.id,
            label: course.title,
          }))}
          placeholder="Select a course"
          className="w-full sm:w-[300px]"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.atRisk}</div>
                <p className="text-sm text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <TrendingUp className="h-6 w-6 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgProgress.toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "dropped", label: "Dropped" },
          ]}
          className="w-[150px]"
        />
      </div>

      {/* Student List */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="at-risk">At Risk ({stats.atRisk})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "No students enrolled in this course yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((enrollment) => (
                <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar
                          src={undefined}
                          fallback={enrollment.student?.full_name || "S"}
                          size="md"
                        />
                        <div>
                          <h3 className="font-medium">
                            {enrollment.student?.full_name || "Student"}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {enrollment.student?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Progress */}
                        <div className="w-32">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{enrollment.completion_percentage?.toFixed(0) || 0}%</span>
                          </div>
                          <Progress
                            value={enrollment.completion_percentage || 0}
                            className="h-2"
                          />
                        </div>

                        {/* Grade */}
                        <div className="text-center w-20">
                          <div className="text-lg font-bold">
                            {enrollment.final_grade?.toFixed(1) || "--"}%
                          </div>
                          <p className="text-xs text-muted-foreground">Grade</p>
                        </div>

                        {/* Status */}
                        <Badge
                          variant={
                            enrollment.status === "active"
                              ? "success"
                              : enrollment.status === "completed"
                              ? "info"
                              : "secondary"
                          }
                        >
                          {enrollment.status}
                        </Badge>

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="at-risk" className="mt-4">
          {enrollments.filter((e) => (e.completion_percentage || 0) < 50 && e.status === "active")
            .length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-medium mb-2">No at-risk students</h3>
                <p className="text-muted-foreground">
                  All students are making good progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {enrollments
                .filter((e) => (e.completion_percentage || 0) < 50 && e.status === "active")
                .map((enrollment) => (
                  <Card key={enrollment.id} className="border-warning/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar
                            src={undefined}
                            fallback={enrollment.student?.full_name || "S"}
                            size="md"
                          />
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              {enrollment.student?.full_name || "Student"}
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.student?.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-warning">
                              {enrollment.completion_percentage?.toFixed(0) || 0}%
                            </div>
                            <p className="text-xs text-muted-foreground">Progress</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

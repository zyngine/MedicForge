"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  ClipboardList,
  Search,
  Clock,
  CheckCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { formatDate } from "@/lib/utils";

export default function StudentAssignmentsPage() {
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useMyEnrollments();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "upcoming" | "past" | "submitted">("all");

  // Get all course IDs the student is enrolled in
  const courseIds = enrollments.map((e) => e.course_id);

  // Create a course title lookup map from enrollments
  const courseMap = React.useMemo(() => {
    return new Map(enrollments.map((e) => [e.course_id, e.course?.title || "Course"]));
  }, [enrollments]);

  // Fetch all assignments and filter by enrolled courses
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useAssignments({});

  // Filter to only assignments in enrolled courses
  const assignments = allAssignments.filter(
    (a) => a.module?.course_id && courseIds.includes(a.module.course_id)
  );

  const isLoading = enrollmentsLoading || assignmentsLoading;

  const now = new Date();

  const filteredAssignments = React.useMemo(() => {
    let result = assignments;

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filter === "upcoming") {
      result = result.filter((a) => a.due_date && new Date(a.due_date) > now);
    } else if (filter === "past") {
      result = result.filter((a) => a.due_date && new Date(a.due_date) <= now);
    }

    // Sort by due date
    return result.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [assignments, searchTerm, filter, now]);

  const upcomingCount = assignments.filter(
    (a) => a.due_date && new Date(a.due_date) > now
  ).length;
  const pastCount = assignments.filter(
    (a) => a.due_date && new Date(a.due_date) <= now
  ).length;

  const getStatusBadge = (assignment: typeof assignments[0]) => {
    if (!assignment.due_date) {
      return <Badge variant="secondary">No Due Date</Badge>;
    }

    const dueDate = new Date(assignment.due_date);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Past Due</Badge>;
    } else if (daysUntilDue === 0) {
      return <Badge variant="warning">Due Today</Badge>;
    } else if (daysUntilDue <= 3) {
      return <Badge variant="warning">Due Soon</Badge>;
    }
    return <Badge variant="success">Upcoming</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return <ClipboardList className="h-4 w-4" />;
      case "written":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          My Assignments
        </h1>
        <p className="text-muted-foreground">
          View and complete assignments across all your courses
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{assignments.length}</div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{upcomingCount}</div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pastCount}</div>
                <p className="text-sm text-muted-foreground">Completed/Past</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assignments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "You don't have any assignments yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/student/courses/${assignment.module?.course_id}/assignments/${assignment.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTypeIcon(assignment.type || 'quiz')}
                          </div>
                          <div>
                            <h3 className="font-medium">{assignment.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {assignment.module?.course_id ? courseMap.get(assignment.module.course_id) : "Course"}
                            </p>
                            {assignment.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {assignment.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(assignment)}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {assignment.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(assignment.due_date)}
                              </span>
                            )}
                            <span>{assignment.points_possible} pts</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

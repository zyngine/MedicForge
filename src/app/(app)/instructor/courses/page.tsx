"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  SkeletonCourseGrid,
} from "@/components/ui";
import {
  Plus,
  Search,
  MoreVertical,
  Users,
  BookOpen,
  Clock,
  Edit,
  Copy,
  Archive,
  Trash2,
  Eye,
  GraduationCap,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useInstructorCourses, useArchiveCourse, useDeleteCourse, type CourseWithDetails } from "@/lib/hooks/use-courses";
import { useSubscriptionEnforcement } from "@/lib/hooks/use-subscription-enforcement";
import { LimitWarningBanner, LimitReachedAlert, UpgradeModal } from "@/components/subscription";
import { DuplicateCourseModal } from "@/components/courses/DuplicateCourseModal";
import { formatDate } from "@/lib/utils";

const courseTypes = [
  { value: "all", label: "All Types" },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
  { value: "Custom", label: "Custom" },
];

const statusFilters = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function getStatusBadge(course: CourseWithDetails) {
  if (course.is_archived) {
    return <Badge variant="default">Archived</Badge>;
  }

  const now = new Date();
  const startDate = course.start_date ? new Date(course.start_date) : null;
  const endDate = course.end_date ? new Date(course.end_date) : null;

  if (endDate && now > endDate) {
    return <Badge variant="info">Completed</Badge>;
  }
  if (startDate && now < startDate) {
    return <Badge variant="secondary">Upcoming</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}

function getCourseStatus(course: CourseWithDetails): string {
  if (course.is_archived) return "archived";

  const now = new Date();
  const startDate = course.start_date ? new Date(course.start_date) : null;
  const endDate = course.end_date ? new Date(course.end_date) : null;

  if (endDate && now > endDate) return "completed";
  if (startDate && now < startDate) return "upcoming";
  return "active";
}

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    EMR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    EMT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    AEMT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Paramedic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    Custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors.Custom}`}>
      {type}
    </span>
  );
}

export default function InstructorCoursesPage() {
  const { data: courses = [], isLoading, error, refetch } = useInstructorCourses();
  const { mutateAsync: archiveCourse } = useArchiveCourse();
  const { mutateAsync: deleteCourse } = useDeleteCourse();

  // Subscription enforcement
  const {
    usage,
    canAddCourse,
    courseWarning,
    courseAtLimit,
    limits,
    tier,
  } = useSubscriptionEnforcement();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [duplicateCourse, setDuplicateCourse] = React.useState<CourseWithDetails | null>(null);

  const filteredCourses = courses.filter((course: CourseWithDetails) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || course.course_type === typeFilter;
    const status = getCourseStatus(course);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleArchive = async (courseId: string) => {
    if (confirm("Are you sure you want to archive this course?")) {
      await archiveCourse(courseId);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      await deleteCourse(courseId);
    }
  };

  if (isLoading) {
    return <SkeletonCourseGrid count={6} />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-error mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleCreateCourse = (e: React.MouseEvent) => {
    if (!canAddCourse) {
      e.preventDefault();
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress.
            {limits.courses !== -1 && (
              <span className="ml-2 text-sm">
                ({usage.courseCount}/{limits.courses} courses used)
              </span>
            )}
          </p>
        </div>
        {canAddCourse ? (
          <Button asChild>
            <Link href="/instructor/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        ) : (
          <Button onClick={handleCreateCourse}>
            <Lock className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        )}
      </div>

      {/* Subscription Limit Warnings */}
      {courseAtLimit && limits.courses !== -1 && (
        <LimitReachedAlert
          type="course"
          current={usage.courseCount}
          limit={limits.courses}
          tier={tier}
          isAdmin
        />
      )}
      {courseWarning && limits.courses !== -1 && (
        <LimitWarningBanner
          type="course"
          current={usage.courseCount}
          limit={limits.courses}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Select
                options={courseTypes}
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-[140px]"
              />
              <Select
                options={statusFilters}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-[140px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first course"}
            </p>
            <Button asChild>
              <Link href="/instructor/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      {getTypeBadge(course.course_type || 'Custom')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(course)}
                    <Dropdown
                      trigger={
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                      align="right"
                    >
                      <DropdownItem
                        icon={<Eye className="h-4 w-4" />}
                        onClick={() => window.location.href = `/instructor/courses/${course.id}`}
                      >
                        View Course
                      </DropdownItem>
                      <DropdownItem
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => window.location.href = `/instructor/courses/${course.id}/edit`}
                      >
                        Edit Course
                      </DropdownItem>
                      <DropdownItem
                        icon={<Copy className="h-4 w-4" />}
                        onClick={() => setDuplicateCourse(course)}
                      >
                        Duplicate
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        icon={<Archive className="h-4 w-4" />}
                        onClick={() => handleArchive(course.id)}
                      >
                        Archive
                      </DropdownItem>
                      <DropdownItem
                        icon={<Trash2 className="h-4 w-4" />}
                        destructive
                        onClick={() => handleDelete(course.id)}
                      >
                        Delete
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>

                {/* Course Info */}
                <Link href={`/instructor/courses/${course.id}`} className="block group">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description || "No description"}
                  </p>
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {course.enrollments_count || 0}
                      {course.max_students ? `/${course.max_students}` : ""} students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {course.modules_count || 0} modules
                    </span>
                  </div>
                </div>

                {/* Dates */}
                {(course.start_date || course.end_date) && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {course.start_date && formatDate(course.start_date)}
                    {course.start_date && course.end_date && " - "}
                    {course.end_date && formatDate(course.end_date)}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Code: {course.enrollment_code}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/instructor/courses/${course.id}`}>
                      Manage
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        type="course"
        currentTier={tier}
      />

      {/* Duplicate Course Modal */}
      {duplicateCourse && (
        <DuplicateCourseModal
          isOpen={!!duplicateCourse}
          onClose={() => setDuplicateCourse(null)}
          course={duplicateCourse}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

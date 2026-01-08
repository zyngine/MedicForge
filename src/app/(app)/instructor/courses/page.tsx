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
  Progress,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
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
} from "lucide-react";

// Mock data
const courses = [
  {
    id: "1",
    title: "EMT Basic - Spring 2024",
    description: "Comprehensive EMT certification course covering all NREMT requirements.",
    type: "EMT",
    enrollmentCode: "EMT2024S",
    students: 32,
    maxStudents: 40,
    progress: 65,
    startDate: "2024-01-15",
    endDate: "2024-05-15",
    status: "active",
    modules: 12,
    completedModules: 8,
  },
  {
    id: "2",
    title: "Paramedic - Fall 2024",
    description: "Advanced paramedic training program with clinical rotations.",
    type: "Paramedic",
    enrollmentCode: "PARA2024F",
    students: 28,
    maxStudents: 30,
    progress: 42,
    startDate: "2024-08-20",
    endDate: "2025-05-20",
    status: "active",
    modules: 24,
    completedModules: 10,
  },
  {
    id: "3",
    title: "AEMT - Spring 2024",
    description: "Advanced EMT training bridging EMT-Basic to Paramedic.",
    type: "AEMT",
    enrollmentCode: "AEMT2024S",
    students: 22,
    maxStudents: 25,
    progress: 78,
    startDate: "2024-01-10",
    endDate: "2024-04-10",
    status: "active",
    modules: 8,
    completedModules: 6,
  },
  {
    id: "4",
    title: "EMR Refresher Course",
    description: "Refresher course for Emergency Medical Responders.",
    type: "EMR",
    enrollmentCode: "EMR2024R",
    students: 15,
    maxStudents: 20,
    progress: 100,
    startDate: "2023-10-01",
    endDate: "2023-12-15",
    status: "completed",
    modules: 6,
    completedModules: 6,
  },
  {
    id: "5",
    title: "EMT Basic - Fall 2024",
    description: "Upcoming EMT certification course for Fall semester.",
    type: "EMT",
    enrollmentCode: "EMT2024F",
    students: 0,
    maxStudents: 40,
    progress: 0,
    startDate: "2024-08-15",
    endDate: "2024-12-15",
    status: "draft",
    modules: 12,
    completedModules: 0,
  },
];

const courseTypes = [
  { value: "all", label: "All Types" },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
];

const statusFilters = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "completed":
      return <Badge variant="info">Completed</Badge>;
    case "archived":
      return <Badge variant="default">Archived</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    EMR: "bg-green-100 text-green-800",
    EMT: "bg-blue-100 text-blue-800",
    AEMT: "bg-purple-100 text-purple-800",
    Paramedic: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
      {type}
    </span>
  );
}

export default function InstructorCoursesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || course.type === typeFilter;
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/instructor/courses/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

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
                      {getTypeBadge(course.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(course.status)}
                    <Dropdown
                      trigger={
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                      align="right"
                    >
                      <DropdownItem icon={<Eye className="h-4 w-4" />}>
                        View Course
                      </DropdownItem>
                      <DropdownItem icon={<Edit className="h-4 w-4" />}>
                        Edit Course
                      </DropdownItem>
                      <DropdownItem icon={<Copy className="h-4 w-4" />}>
                        Duplicate
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem icon={<Archive className="h-4 w-4" />}>
                        Archive
                      </DropdownItem>
                      <DropdownItem icon={<Trash2 className="h-4 w-4" />} destructive>
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
                    {course.description}
                  </p>
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {course.students}/{course.maxStudents} students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {course.completedModules}/{course.modules} modules
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} size="sm" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Code: {course.enrollmentCode}</span>
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
    </div>
  );
}

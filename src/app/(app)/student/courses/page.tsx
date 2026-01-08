"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Progress,
} from "@/components/ui";
import {
  Search,
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  Play,
  Award,
} from "lucide-react";

const enrolledCourses = [
  {
    id: "1",
    title: "EMT Basic - Spring 2024",
    description: "Comprehensive EMT certification course covering all NREMT requirements.",
    type: "EMT",
    instructor: "Dr. Sarah Johnson",
    progress: 65,
    currentModule: "Module 3: Patient Assessment",
    totalModules: 12,
    completedModules: 8,
    nextDeadline: "Feb 20 - Module 3 Quiz",
    status: "active",
  },
  {
    id: "2",
    title: "CPR/AED Certification",
    description: "Basic Life Support certification for healthcare providers.",
    type: "Certification",
    instructor: "Dr. James Miller",
    progress: 100,
    currentModule: "Completed",
    totalModules: 4,
    completedModules: 4,
    nextDeadline: null,
    status: "completed",
    certificate: true,
  },
];

const availableCourses = [
  {
    id: "3",
    title: "AEMT Bridge Course",
    description: "Advanced EMT training bridging EMT-Basic to Paramedic.",
    type: "AEMT",
    instructor: "Dr. Sarah Johnson",
    startDate: "Mar 15, 2024",
    duration: "16 weeks",
    enrollmentCode: "AEMT2024S",
  },
  {
    id: "4",
    title: "Trauma Life Support",
    description: "Specialized training in pre-hospital trauma care.",
    type: "Specialty",
    instructor: "Dr. Michael Rodriguez",
    startDate: "Apr 1, 2024",
    duration: "8 weeks",
    enrollmentCode: "TLS2024",
  },
];

export default function StudentCoursesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showEnrollment, setShowEnrollment] = React.useState(false);
  const [enrollmentCode, setEnrollmentCode] = React.useState("");

  const filteredCourses = enrolledCourses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning.
          </p>
        </div>
        <Button onClick={() => setShowEnrollment(true)}>
          Enroll in Course
        </Button>
      </div>

      {/* Enrollment Card */}
      {showEnrollment && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h3 className="font-medium mb-2">Enter Enrollment Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your instructor will provide you with an enrollment code to join their course.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., EMT2024S"
                    value={enrollmentCode}
                    onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                    className="max-w-xs font-mono"
                  />
                  <Button disabled={!enrollmentCode}>Enroll</Button>
                  <Button variant="ghost" onClick={() => setShowEnrollment(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Active Courses */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Courses</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {filteredCourses.filter((c) => c.status === "active").map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="info">{course.type}</Badge>
                  </div>
                  <Badge variant="success">In Progress</Badge>
                </div>

                <Link href={`/student/courses/${course.id}`} className="block group">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description}
                  </p>
                </Link>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{course.instructor}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{course.currentModule}</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} size="sm" />
                    <p className="text-xs text-muted-foreground">
                      {course.completedModules} of {course.totalModules} modules completed
                    </p>
                  </div>

                  {course.nextDeadline && (
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <Clock className="h-4 w-4" />
                      <span>Next: {course.nextDeadline}</span>
                    </div>
                  )}

                  <Button className="w-full" asChild>
                    <Link href={`/student/courses/${course.id}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Courses */}
      {filteredCourses.filter((c) => c.status === "completed").length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Completed Courses</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCourses.filter((c) => c.status === "completed").map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="h-5 w-5 text-success" />
                      </div>
                      <Badge variant="secondary">{course.type}</Badge>
                    </div>
                    <Badge variant="success">Completed</Badge>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Users className="h-4 w-4" />
                    <span>{course.instructor}</span>
                  </div>

                  <div className="space-y-2">
                    <Progress value={100} size="sm" variant="success" />
                    <p className="text-xs text-success">
                      All {course.totalModules} modules completed
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/student/courses/${course.id}`}>
                        Review Course
                      </Link>
                    </Button>
                    {course.certificate && (
                      <Button variant="outline" className="flex-1">
                        <Award className="h-4 w-4 mr-2" />
                        Certificate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Courses */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Courses</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use an enrollment code to join these courses.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {availableCourses.map((course) => (
            <Card key={course.id} className="border-dashed">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary">{course.type}</Badge>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {course.description}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Starts {course.startDate} ({course.duration})</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEnrollmentCode(course.enrollmentCode);
                    setShowEnrollment(true);
                  }}
                >
                  Enroll with Code
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

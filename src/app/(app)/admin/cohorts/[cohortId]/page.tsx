"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Modal,
  Label,
  Select,
  Spinner,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Checkbox,
} from "@/components/ui";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Search,
  BookOpen,
  Calendar,
  GraduationCap,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  useCohort,
  useCohortMembers,
  useCohortCourses,
  useBatchEnrollCohort,
  useStudents,
} from "@/lib/hooks/use-cohorts";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { formatDate } from "@/lib/utils";

const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
];

export default function CohortDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.cohortId as string;

  const { cohort, isLoading: cohortLoading } = useCohort(cohortId);
  const {
    members,
    isLoading: membersLoading,
    addMembers,
    removeMember,
    updateMemberStatus,
    isAdding,
  } = useCohortMembers(cohortId);
  const {
    courses: cohortCourses,
    isLoading: coursesLoading,
    enrollInCourse,
    unenrollFromCourse,
    isEnrolling,
  } = useCohortCourses(cohortId);
  const { batchEnroll, isEnrolling: isBatchEnrolling } = useBatchEnrollCohort();

  const { students } = useStudents();
  const { data: allCourses = [] } = useInstructorCourses();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [enrollAfterAdd, setEnrollAfterAdd] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get IDs of students already in cohort
  const existingMemberIds = new Set(members.map((m) => m.student_id));

  // Filter students not already in cohort
  const availableStudents = students.filter((s) => !existingMemberIds.has(s.id));

  // Filter courses not already assigned to cohort
  const existingCourseIds = new Set(cohortCourses.map((c) => c.course_id));
  const availableCourses = allCourses.filter((c) => !existingCourseIds.has(c.id));

  const filteredMembers = members.filter((member) => {
    const name = member.student?.full_name || "";
    const email = member.student?.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddMembers = async () => {
    if (selectedStudents.length === 0) {
      setError("Please select at least one student");
      return;
    }

    try {
      await addMembers(selectedStudents);

      // Enroll in all cohort courses if requested
      if (enrollAfterAdd && cohortCourses.length > 0) {
        for (const cc of cohortCourses) {
          await batchEnroll({ cohortId, courseId: cc.course_id });
        }
      }

      setShowAddMembersModal(false);
      setSelectedStudents([]);
      setSuccess(`Added ${selectedStudents.length} students to cohort`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add students");
    }
  };

  const handleAddCourse = async () => {
    if (!selectedCourse) {
      setError("Please select a course");
      return;
    }

    try {
      await enrollInCourse(selectedCourse);

      // Batch enroll all active members
      await batchEnroll({ cohortId, courseId: selectedCourse });

      setShowAddCourseModal(false);
      setSelectedCourse("");
      setSuccess("Course added and members enrolled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add course");
    }
  };

  const handleRemoveMember = async (memberId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this cohort?`)) return;

    try {
      await removeMember(memberId);
      setSuccess(`${studentName} removed from cohort`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleStatusChange = async (memberId: string, status: string) => {
    try {
      await updateMemberStatus({ memberId, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleRemoveCourse = async (cohortCourseId: string) => {
    if (!confirm("Remove this course from the cohort?")) return;

    try {
      await unenrollFromCourse(cohortCourseId);
      setSuccess("Course removed from cohort");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const isLoading = cohortLoading || membersLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <h3 className="text-lg font-medium mb-2">Cohort not found</h3>
          <Button onClick={() => router.push("/admin/cohorts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cohorts
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/cohorts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cohorts
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{cohort.name}</h1>
            {cohort.course_type && (
              <Badge variant="outline">{cohort.course_type}</Badge>
            )}
            <Badge variant={cohort.is_active ? "success" : "secondary"}>
              {cohort.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {cohort.description && (
            <p className="text-muted-foreground">{cohort.description}</p>
          )}
          {(cohort.start_date || cohort.expected_graduation) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4" />
              {cohort.start_date && formatDate(cohort.start_date)}
              {cohort.start_date && cohort.expected_graduation && " - "}
              {cohort.expected_graduation && formatDate(cohort.expected_graduation)}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.status === "active").length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cohortCourses.length}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.status === "graduated").length}
                </p>
                <p className="text-xs text-muted-foreground">Graduated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({cohortCourses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Members Search & Add */}
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-md"
            />
            <Button onClick={() => setShowAddMembersModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Students
            </Button>
          </div>

          {/* Members List */}
          <Card>
            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No members</h3>
                  <p className="text-muted-foreground mb-4">
                    Add students to this cohort to get started
                  </p>
                  <Button onClick={() => setShowAddMembersModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Students
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">Student</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Joined</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b last:border-0">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{member.student?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {member.student?.email}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              options={MEMBER_STATUSES}
                              value={member.status}
                              onChange={(v) => handleStatusChange(member.id, v)}
                              className="w-[140px]"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {formatDate(member.joined_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveMember(member.id, member.student?.full_name || "Student")
                              }
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          {/* Add Course Button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowAddCourseModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </div>

          {/* Courses List */}
          <Card>
            <CardContent className="p-0">
              {cohortCourses.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No courses</h3>
                  <p className="text-muted-foreground mb-4">
                    Add courses to batch enroll cohort members
                  </p>
                  <Button onClick={() => setShowAddCourseModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">Course</th>
                        <th className="text-left py-3 px-4 font-medium">Type</th>
                        <th className="text-left py-3 px-4 font-medium">Enrolled</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortCourses.map((cc) => (
                        <tr key={cc.id} className="border-b last:border-0">
                          <td className="py-3 px-4">
                            <Link
                              href={`/instructor/courses/${cc.course_id}`}
                              className="font-medium hover:text-primary"
                            >
                              {cc.course?.title}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {cc.course?.course_type && (
                              <Badge variant="outline">{cc.course.course_type}</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {formatDate(cc.enrolled_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCourse(cc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Members Modal */}
      <Modal
        isOpen={showAddMembersModal}
        onClose={() => {
          setShowAddMembersModal(false);
          setSelectedStudents([]);
        }}
        title="Add Students to Cohort"
        size="lg"
      >
        <div className="space-y-4">
          {availableStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              All students are already in this cohort
            </p>
          ) : (
            <>
              <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                {availableStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))}
              </div>

              {cohortCourses.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Checkbox
                    id="enrollAfterAdd"
                    checked={enrollAfterAdd}
                    onChange={(checked) => setEnrollAfterAdd(checked as boolean)}
                  />
                  <Label htmlFor="enrollAfterAdd" className="cursor-pointer">
                    Automatically enroll in cohort courses ({cohortCourses.length} courses)
                  </Label>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedStudents.length} students selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedStudents([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={selectedStudents.length === 0 || isAdding}
              >
                {isAdding ? <Spinner size="sm" className="mr-2" /> : null}
                Add {selectedStudents.length} Students
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Course Modal */}
      <Modal
        isOpen={showAddCourseModal}
        onClose={() => {
          setShowAddCourseModal(false);
          setSelectedCourse("");
        }}
        title="Add Course to Cohort"
        size="md"
      >
        <div className="space-y-4">
          {availableCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              All available courses are already assigned to this cohort
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Course</Label>
                <Select
                  options={[
                    { value: "", label: "Select a course..." },
                    ...availableCourses.map((c) => ({
                      value: c.id,
                      label: c.title,
                    })),
                  ]}
                  value={selectedCourse}
                  onChange={setSelectedCourse}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">What happens next:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Course will be linked to this cohort</li>
                  <li>All {members.filter((m) => m.status === "active").length} active members will be enrolled</li>
                  <li>Future members added with auto-enroll will also be enrolled</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCourseModal(false);
                setSelectedCourse("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCourse}
              disabled={!selectedCourse || isEnrolling || isBatchEnrolling}
            >
              {(isEnrolling || isBatchEnrolling) ? <Spinner size="sm" className="mr-2" /> : null}
              Add Course & Enroll Members
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

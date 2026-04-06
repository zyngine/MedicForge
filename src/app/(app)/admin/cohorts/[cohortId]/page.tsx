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
  Link2,
  ExternalLink,
  Edit,
  Star,
  Clock,
  Play,
  CalendarDays,
  XCircle,
} from "lucide-react";
import {
  useCohort,
  useCohortMembers,
  useCohortCourses,
  useBatchEnrollCohort,
  useStudents,
} from "@/lib/hooks/use-cohorts";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import {
  useProgramLinks,
  useCreateProgramLink,
  useUpdateProgramLink,
  useDeleteProgramLink,
  LINK_CATEGORIES,
  ProgramLink,
  getCategoryLabel,
} from "@/lib/hooks/use-program-links";
import {
  useProgramSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useExcludedDates,
  useAddExcludedDate,
  useRemoveExcludedDate,
  useGenerateSessions,
  DAYS_OF_WEEK,
  SESSION_TYPES,
  ProgramSchedule,
  getSessionTypeLabel,
  formatTimeDisplay,
} from "@/lib/hooks/use-program-schedules";
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

  // Program links hooks
  const { data: programLinks = [], isLoading: linksLoading } = useProgramLinks(cohortId);
  const createLinkMutation = useCreateProgramLink();
  const updateLinkMutation = useUpdateProgramLink();
  const deleteLinkMutation = useDeleteProgramLink();

  // Program schedules hooks
  const { data: schedules = [], isLoading: schedulesLoading } = useProgramSchedules(cohortId);
  const { data: excludedDates = [] } = useExcludedDates(cohortId);
  const createScheduleMutation = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();
  const addExcludedDateMutation = useAddExcludedDate();
  const removeExcludedDateMutation = useRemoveExcludedDate();
  const generateSessionsMutation = useGenerateSessions();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ProgramLink | null>(null);
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    description: "",
    category: "other",
    is_required: false,
  });
  // Schedule state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProgramSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    title: "Class",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "12:00",
    session_type: "lecture",
    location: "",
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    start_date: "",
    end_date: "",
  });
  const [showExcludedDateModal, setShowExcludedDateModal] = useState(false);
  const [excludedDateForm, setExcludedDateForm] = useState({
    date: "",
    reason: "",
  });
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

  // Link handlers
  const handleOpenLinkModal = (link?: ProgramLink) => {
    if (link) {
      setEditingLink(link);
      setLinkForm({
        title: link.title,
        url: link.url,
        description: link.description || "",
        category: link.category,
        is_required: link.is_required,
      });
    } else {
      setEditingLink(null);
      setLinkForm({
        title: "",
        url: "",
        description: "",
        category: "other",
        is_required: false,
      });
    }
    setShowLinkModal(true);
  };

  const handleSaveLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      setError("Title and URL are required");
      return;
    }

    try {
      if (editingLink) {
        await updateLinkMutation.mutateAsync({
          id: editingLink.id,
          title: linkForm.title,
          url: linkForm.url,
          description: linkForm.description || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: linkForm.category as any,
          is_required: linkForm.is_required,
        });
        setSuccess("Link updated successfully");
      } else {
        await createLinkMutation.mutateAsync({
          program_id: cohortId,
          title: linkForm.title,
          url: linkForm.url,
          description: linkForm.description || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: linkForm.category as any,
          is_required: linkForm.is_required,
        });
        setSuccess("Link added successfully");
      }
      setShowLinkModal(false);
      setEditingLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    }
  };

  const handleDeleteLink = async (linkId: string, linkTitle: string) => {
    if (!confirm(`Delete "${linkTitle}"?`)) return;

    try {
      await deleteLinkMutation.mutateAsync(linkId);
      setSuccess("Link deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    }
  };

  const handleToggleLinkActive = async (link: ProgramLink) => {
    try {
      await updateLinkMutation.mutateAsync({
        id: link.id,
        is_active: !link.is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link");
    }
  };

  // Schedule handlers
  const handleOpenScheduleModal = (schedule?: ProgramSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({
        title: schedule.title,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        session_type: schedule.session_type,
        location: schedule.location || "",
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        title: "Class",
        day_of_week: 1,
        start_time: "09:00",
        end_time: "12:00",
        session_type: "lecture",
        location: "",
      });
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      if (editingSchedule) {
        await updateScheduleMutation.mutateAsync({
          id: editingSchedule.id,
          title: scheduleForm.title,
          day_of_week: scheduleForm.day_of_week,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session_type: scheduleForm.session_type as any,
          location: scheduleForm.location || undefined,
        });
        setSuccess("Schedule updated successfully");
      } else {
        await createScheduleMutation.mutateAsync({
          program_id: cohortId,
          title: scheduleForm.title,
          day_of_week: scheduleForm.day_of_week,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session_type: scheduleForm.session_type as any,
          location: scheduleForm.location || undefined,
        });
        setSuccess("Schedule added successfully");
      }
      setShowScheduleModal(false);
      setEditingSchedule(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, title: string) => {
    if (!confirm(`Delete "${title}" from the schedule?`)) return;

    try {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      setSuccess("Schedule deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  };

  const handleToggleScheduleActive = async (schedule: ProgramSchedule) => {
    try {
      await updateScheduleMutation.mutateAsync({
        id: schedule.id,
        is_active: !schedule.is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  };

  const handleGenerateSessions = async () => {
    if (!generateForm.start_date || !generateForm.end_date) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(generateForm.start_date) > new Date(generateForm.end_date)) {
      setError("End date must be after start date");
      return;
    }

    try {
      const count = await generateSessionsMutation.mutateAsync({
        program_id: cohortId,
        start_date: generateForm.start_date,
        end_date: generateForm.end_date,
      });
      setSuccess(`Generated ${count} attendance sessions`);
      setShowGenerateModal(false);
      setGenerateForm({ start_date: "", end_date: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate sessions");
    }
  };

  const handleAddExcludedDate = async () => {
    if (!excludedDateForm.date) {
      setError("Please select a date");
      return;
    }

    try {
      await addExcludedDateMutation.mutateAsync({
        program_id: cohortId,
        excluded_date: excludedDateForm.date,
        reason: excludedDateForm.reason || undefined,
      });
      setSuccess("Date excluded successfully");
      setShowExcludedDateModal(false);
      setExcludedDateForm({ date: "", reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add excluded date");
    }
  };

  const handleRemoveExcludedDate = async (dateId: string) => {
    try {
      await removeExcludedDateMutation.mutateAsync(dateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove date");
    }
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
          <TabsTrigger value="schedule">Schedule ({schedules.length})</TabsTrigger>
          <TabsTrigger value="links">Links ({programLinks.length})</TabsTrigger>
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

        <TabsContent value="schedule" className="space-y-4">
          {/* Schedule Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExcludedDateModal(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Excluded Dates ({excludedDates.length})
              </Button>
              {schedules.length > 0 && (
                <Button variant="outline" onClick={() => setShowGenerateModal(true)}>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Generate Sessions
                </Button>
              )}
            </div>
            <Button onClick={() => handleOpenScheduleModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Recurring class times for this program
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No schedule set</h3>
                  <p className="text-muted-foreground mb-4">
                    Add recurring class times for this program
                  </p>
                  <Button onClick={() => handleOpenScheduleModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Class Time
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySchedules = schedules.filter((s) => s.day_of_week === day.value);
                    if (daySchedules.length === 0) return null;

                    return (
                      <div key={day.value} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{day.label}</h4>
                        <div className="space-y-2">
                          {daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[100px]">
                                  <p className="font-medium">
                                    {formatTimeDisplay(schedule.start_time)} - {formatTimeDisplay(schedule.end_time)}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">{schedule.title}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Badge variant="outline" className="text-xs">
                                      {getSessionTypeLabel(schedule.session_type)}
                                    </Badge>
                                    {schedule.location && (
                                      <span>{schedule.location}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={schedule.is_active ? "success" : "secondary"}
                                  className="cursor-pointer"
                                  onClick={() => handleToggleScheduleActive(schedule)}
                                >
                                  {schedule.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenScheduleModal(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSchedule(schedule.id, schedule.title)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Excluded Dates Summary */}
          {excludedDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Excluded Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {excludedDates.slice(0, 10).map((ed) => (
                    <Badge
                      key={ed.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveExcludedDate(ed.id)}
                    >
                      {formatDate(ed.excluded_date)}
                      {ed.reason && ` - ${ed.reason}`}
                      <XCircle className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  {excludedDates.length > 10 && (
                    <Badge variant="secondary">+{excludedDates.length - 10} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          {/* Add Link Button */}
          <div className="flex justify-end">
            <Button onClick={() => handleOpenLinkModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </div>

          {/* Links List */}
          <Card>
            <CardContent className="p-0">
              {linksLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : programLinks.length === 0 ? (
                <div className="p-12 text-center">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No links yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add helpful resources and links for students in this program
                  </p>
                  <Button onClick={() => handleOpenLinkModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">Title</th>
                        <th className="text-left py-3 px-4 font-medium">Category</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programLinks.map((link) => (
                        <tr key={link.id} className="border-b last:border-0">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {link.is_required && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                              <div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary inline-flex items-center gap-1"
                                >
                                  {link.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                {link.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {link.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{getCategoryLabel(link.category)}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={link.is_active ? "success" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => handleToggleLinkActive(link)}
                            >
                              {link.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLinkModal(link)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLink(link.id, link.title)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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

      {/* Add/Edit Link Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setEditingLink(null);
        }}
        title={editingLink ? "Edit Link" : "Add Link"}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={linkForm.title}
              onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
              placeholder="e.g., NREMT Registration"
            />
          </div>

          <div className="space-y-2">
            <Label>URL *</Label>
            <Input
              value={linkForm.url}
              onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={linkForm.description}
              onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
              placeholder="Brief description of this resource"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              options={LINK_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              value={linkForm.category}
              onChange={(v) => setLinkForm({ ...linkForm, category: v })}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Checkbox
              id="isRequired"
              checked={linkForm.is_required}
              onChange={(checked) => setLinkForm({ ...linkForm, is_required: checked as boolean })}
            />
            <Label htmlFor="isRequired" className="cursor-pointer">
              <span className="font-medium">Required resource</span>
              <p className="text-sm text-muted-foreground">
                Mark as required for students to access
              </p>
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkModal(false);
                setEditingLink(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLink}
              disabled={createLinkMutation.isPending || updateLinkMutation.isPending}
            >
              {(createLinkMutation.isPending || updateLinkMutation.isPending) ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              {editingLink ? "Save Changes" : "Add Link"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingSchedule(null);
        }}
        title={editingSchedule ? "Edit Class Time" : "Add Class Time"}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              placeholder="e.g., Morning Lecture"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                options={DAYS_OF_WEEK.map((d) => ({
                  value: d.value.toString(),
                  label: d.label,
                }))}
                value={scheduleForm.day_of_week.toString()}
                onChange={(v) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(v) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select
                options={SESSION_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                value={scheduleForm.session_type}
                onChange={(v) => setScheduleForm({ ...scheduleForm, session_type: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={scheduleForm.start_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={scheduleForm.end_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <Input
              value={scheduleForm.location}
              onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
              placeholder="e.g., Room 101"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduleModal(false);
                setEditingSchedule(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            >
              {(createScheduleMutation.isPending || updateScheduleMutation.isPending) ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              {editingSchedule ? "Save Changes" : "Add Class Time"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Sessions Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Attendance Sessions"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              This will create attendance sessions for all active schedule items between the selected dates.
              Existing sessions will not be duplicated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={generateForm.start_date}
                onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={generateForm.end_date}
                onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
              />
            </div>
          </div>

          {excludedDates.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {excludedDates.length} date(s) will be excluded (holidays, breaks, etc.)
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateSessions}
              disabled={generateSessionsMutation.isPending}
            >
              {generateSessionsMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Sessions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Excluded Date Modal */}
      <Modal
        isOpen={showExcludedDateModal}
        onClose={() => setShowExcludedDateModal(false)}
        title="Manage Excluded Dates"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Excluded dates (holidays, breaks, etc.) will be skipped when generating attendance sessions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date to Exclude</Label>
                <Input
                  type="date"
                  value={excludedDateForm.date}
                  onChange={(e) => setExcludedDateForm({ ...excludedDateForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={excludedDateForm.reason}
                  onChange={(e) => setExcludedDateForm({ ...excludedDateForm, reason: e.target.value })}
                  placeholder="e.g., Holiday"
                />
              </div>
            </div>
            <Button
              onClick={handleAddExcludedDate}
              disabled={addExcludedDateMutation.isPending}
              className="w-full"
            >
              {addExcludedDateMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Excluded Date
            </Button>
          </div>

          {excludedDates.length > 0 && (
            <div className="border-t pt-4">
              <Label className="mb-3 block">Current Excluded Dates</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {excludedDates.map((ed) => (
                  <div
                    key={ed.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="font-medium">{formatDate(ed.excluded_date)}</p>
                      {ed.reason && (
                        <p className="text-sm text-muted-foreground">{ed.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExcludedDate(ed.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExcludedDateModal(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

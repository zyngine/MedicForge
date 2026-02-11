"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Avatar,
  Select,
  Spinner,
  Modal,
  Input,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Search,
  Shield,
  Edit3,
  GraduationCap,
  Users,
} from "lucide-react";
import {
  useCourseInstructors,
  useAddCourseInstructor,
  useUpdateCourseInstructor,
  useRemoveCourseInstructor,
  INSTRUCTOR_ROLES,
  type CourseInstructorRole,
} from "@/lib/hooks/use-course-instructors";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";

interface CourseInstructorsManagerProps {
  courseId: string;
  isReadOnly?: boolean;
}

const roleColors: Record<CourseInstructorRole, string> = {
  lead: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  coordinator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  instructor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  assistant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  grader: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export function CourseInstructorsManager({ courseId, isReadOnly = false }: CourseInstructorsManagerProps) {
  const { tenant } = useTenant();
  const { profile } = useUser();
  const { data: instructors, isLoading } = useCourseInstructors(courseId);
  const addInstructor = useAddCourseInstructor();
  const updateInstructor = useUpdateCourseInstructor();
  const removeInstructor = useRemoveCourseInstructor();

  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<CourseInstructorRole>("instructor");

  // Check if current user can manage instructors
  const currentUserInstructor = instructors?.find((i) => i.instructor_id === profile?.id);
  const canManage = !isReadOnly && (
    profile?.role === "admin" ||
    currentUserInstructor?.role === "lead" ||
    currentUserInstructor?.role === "coordinator"
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2 || !tenant?.id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .eq("tenant_id", tenant.id)
        .in("role", ["instructor", "admin"])
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out already added instructors
      const existingIds = instructors?.map((i) => i.instructor_id) || [];
      setSearchResults((data || []).filter((u) => !existingIds.includes(u.id)));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddInstructor = async (userId: string) => {
    try {
      await addInstructor.mutateAsync({
        courseId,
        instructorId: userId,
        role: selectedRole,
        canEdit: selectedRole !== "grader",
        canGrade: true,
        canManageStudents: selectedRole === "lead" || selectedRole === "coordinator",
      });
      setShowAddDialog(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedRole("instructor");
    } catch (err) {
      console.error("Failed to add instructor:", err);
    }
  };

  const handleUpdateRole = async (id: string, newRole: CourseInstructorRole) => {
    try {
      await updateInstructor.mutateAsync({
        id,
        courseId,
        role: newRole,
        canEdit: newRole !== "grader",
        canManageStudents: newRole === "lead" || newRole === "coordinator",
      });
    } catch (err) {
      console.error("Failed to update instructor:", err);
    }
  };

  const handleRemoveInstructor = async (id: string) => {
    if (!confirm("Are you sure you want to remove this instructor from the course?")) return;

    try {
      await removeInstructor.mutateAsync({ id, courseId });
    } catch (err) {
      console.error("Failed to remove instructor:", err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Course Instructors
              </CardTitle>
              <CardDescription>
                Manage who can teach and grade this course
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instructor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!instructors || instructors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No instructors assigned to this course yet.</p>
              {canManage && (
                <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Instructor
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={instructor.instructor?.avatar_url || undefined}
                      fallback={instructor.instructor?.full_name || "?"}
                      size="md"
                    />
                    <div>
                      <p className="font-medium">{instructor.instructor?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{instructor.instructor?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {instructor.can_edit && (
                        <span title="Can edit course">
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      {instructor.can_grade && (
                        <span title="Can grade">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      {instructor.can_manage_students && (
                        <span title="Can manage students">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    {canManage && instructor.role !== "lead" ? (
                      <Select
                        value={instructor.role}
                        onChange={(value) => handleUpdateRole(instructor.id, value as CourseInstructorRole)}
                        options={INSTRUCTOR_ROLES.filter((r) => r.value !== "lead").map((role) => ({
                          value: role.value,
                          label: role.label,
                        }))}
                        className="w-[140px]"
                      />
                    ) : (
                      <Badge className={roleColors[instructor.role]}>
                        {INSTRUCTOR_ROLES.find((r) => r.value === instructor.role)?.label}
                      </Badge>
                    )}
                    {canManage && instructor.role !== "lead" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInstructor(instructor.id)}
                        disabled={removeInstructor.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Instructor Modal */}
      <Modal
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="Add Instructor"
        description="Search for instructors in your organization to add to this course."
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={selectedRole}
              onChange={(v) => setSelectedRole(v as CourseInstructorRole)}
              options={INSTRUCTOR_ROLES.filter((r) => r.value !== "lead").map((role) => ({
                value: role.value,
                label: role.label,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              {INSTRUCTOR_ROLES.find((r) => r.value === selectedRole)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Search Instructors</label>
            <div className="relative">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleAddInstructor(user.id)}
                  disabled={addInstructor.isPending}
                >
                  <Avatar
                    src={user.avatar_url || undefined}
                    fallback={user.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <p className="text-center text-muted-foreground py-4">No instructors found</p>
          ) : (
            <p className="text-center text-muted-foreground py-4">Type at least 2 characters to search</p>
          )}
        </div>
      </Modal>
    </>
  );
}

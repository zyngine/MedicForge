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
  Input,
  Label,
  Select,
  Modal,
  Alert,
  Spinner,
  Avatar,
} from "@/components/ui";
import {
  Plus,
  Upload,
  Download,
  Search,
  Users,
  UserPlus,
  Mail,
  Trash2,
  Edit,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useSubscriptionEnforcement, getLimitMessage } from "@/lib/hooks/use-subscription-enforcement";
import { LimitWarningBanner, LimitReachedAlert, UpgradeModal } from "@/components/subscription";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string;
}

// Hook to fetch users
function useUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to fetch users");
      }
      const result = await response.json();
      return result.users as User[];
    },
  });
}

type UserRole = "admin" | "instructor" | "student";

// Hook to create/invite a single user
function useCreateUser() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: { email: string; full_name: string; role: UserRole }): Promise<{ user: User; invited: boolean; invite_link?: string }> => {
      if (!tenant?.id) throw new Error("No tenant");

      // Use the invite API which properly creates auth user + profile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch("/api/admin/invite-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            tenant_id: tenant.id,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to invite user");
      }

      return { user: result.user, invited: result.invited, invite_link: result.invite_link };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-usage"] });
    },
  });
}

// Hook for bulk import
function useBulkImportUsers() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (users: Array<{ email: string; full_name: string; role: string }>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const results: Array<{ email: string; success: boolean; error?: string; invited?: boolean }> = [];

      for (const user of users) {
        try {
          // Validate role
          const validRole = ["admin", "instructor", "student"].includes(user.role)
            ? user.role
            : "student";

          // Use the invite API
          const response = await fetch("/api/admin/invite-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              full_name: user.full_name,
              role: validRole,
              tenant_id: tenant.id,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            results.push({ email: user.email, success: false, error: result.error || "Failed" });
          } else {
            results.push({ email: user.email, success: true, invited: result.invited });
          }
        } catch (err) {
          results.push({
            email: user.email,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

// Hook to update user — uses API route to bypass RLS issues with direct client updates
function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<{ full_name: string; role: UserRole; is_active: boolean }>;
    }) => {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update user");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-usage"] });
    },
  });
}

// Hook to delete user (removes from both database and Supabase Auth)
function useDeleteUser() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, deleteFromAuth = true }: { userId: string; deleteFromAuth?: boolean }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenant.id,
          delete_from_auth: deleteFromAuth,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

// Hook to resend invitation
function useResendInvite() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!tenant?.id) throw new Error("No tenant");

      const response = await fetch("/api/admin/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenant.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend invite");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: bulkImport, isPending: isImporting } = useBulkImportUsers();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutateAsync: resendInvite, isPending: isResending } = useResendInvite();

  // Subscription enforcement
  const {
    usage,
    canAddInstructor,
    canAddStudent,
    instructorWarning,
    studentWarning,
    instructorAtLimit,
    studentAtLimit,
    limits,
    tier,
    refetch: refetchUsage,
  } = useSubscriptionEnforcement();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);
  const [editRole, setEditRole] = React.useState<UserRole>("instructor");
  const [isEditSaving, setIsEditSaving] = React.useState(false);
  const [upgradeModalType, setUpgradeModalType] = React.useState<"instructor" | "student">("student");
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [inviteLink, setInviteLink] = React.useState<{ url: string; email: string } | null>(null);
  const [importResults, setImportResults] = React.useState<Array<{
    email: string;
    success: boolean;
    error?: string;
  }> | null>(null);

  // Add user form state
  const [newUser, setNewUser] = React.useState<{
    email: string;
    full_name: string;
    role: UserRole;
  }>({
    email: "",
    full_name: "",
    role: "student",
  });

  // Import state
  const [csvData, setCsvData] = React.useState<Array<{
    email: string;
    full_name: string;
    role: string;
  }>>([]);
  const [csvError, setCsvError] = React.useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "instructor", label: "Instructor" },
    { value: "student", label: "Student" },
  ];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check subscription limits before creating user
    if (newUser.role === "instructor" && !canAddInstructor) {
      setShowAddModal(false);
      setUpgradeModalType("instructor");
      setShowUpgradeModal(true);
      return;
    }

    if (newUser.role === "student" && !canAddStudent) {
      setShowAddModal(false);
      setUpgradeModalType("student");
      setShowUpgradeModal(true);
      return;
    }

    try {
      const result = await createUser(newUser);
      refetchUsage(); // Refresh usage counts
      setShowAddModal(false);
      setNewUser({ email: "", full_name: "", role: "student" });

      // Show success message or invite link modal
      if (result.invite_link) {
        setInviteLink({ url: result.invite_link, email: newUser.email });
      } else if (result.invited) {
        setSuccessMessage(`User added! An invitation email has been sent to ${newUser.email}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setSuccessMessage(`User ${newUser.email} has been added to your organization`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvData([]);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCsvError("No valid data found in CSV");
          return;
        }
        setCsvData(parsed);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): Array<{ email: string; full_name: string; role: string }> => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIndex = header.findIndex((h) => h === "email");
    const nameIndex = header.findIndex((h) => h === "name" || h === "full_name");
    const roleIndex = header.findIndex((h) => h === "role");

    if (emailIndex === -1) {
      throw new Error("CSV must have an 'email' column");
    }

    const result: Array<{ email: string; full_name: string; role: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const email = values[emailIndex];

      if (!email || !email.includes("@")) continue;

      result.push({
        email,
        full_name: nameIndex !== -1 ? values[nameIndex] || "" : "",
        role: roleIndex !== -1 ? values[roleIndex]?.toLowerCase() || "student" : "student",
      });
    }

    return result;
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) return;

    // Check if import would exceed limits
    const instructorsToAdd = csvData.filter((u) => u.role === "instructor").length;
    const studentsToAdd = csvData.filter((u) => u.role === "student").length;

    if (limits.instructors !== -1 && usage.instructorCount + instructorsToAdd > limits.instructors) {
      setError(
        `Cannot import: Adding ${instructorsToAdd} instructors would exceed your limit of ${limits.instructors}. Current: ${usage.instructorCount}.`
      );
      return;
    }

    if (limits.students !== -1 && usage.studentCount + studentsToAdd > limits.students) {
      setError(
        `Cannot import: Adding ${studentsToAdd} students would exceed your limit of ${limits.students}. Current: ${usage.studentCount}.`
      );
      return;
    }

    setError(null);
    try {
      const results = await bulkImport(csvData);
      setImportResults(results);
      refetchUsage(); // Refresh usage counts
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const downloadTemplate = () => {
    const csv = "email,name,role\njohn@example.com,John Doe,student\njane@example.com,Jane Smith,instructor";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-import-template.csv";
    a.click();
  };

  const toggleUserActive = async (user: User) => {
    try {
      await updateUser({
        userId: user.id,
        updates: { is_active: !user.is_active },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser({ userId: userToDelete.id, deleteFromAuth: true });
      setShowDeleteModal(false);
      setUserToDelete(null);
      refetchUsage();
      setSuccessMessage(`User ${userToDelete.email} has been permanently deleted`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setEditRole((user.role as UserRole) ?? "instructor");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!userToEdit) return;
    setIsEditSaving(true);
    try {
      await updateUser({ userId: userToEdit.id, updates: { role: editRole } });
      const name = userToEdit.full_name || userToEdit.email;
      setShowEditModal(false);
      setUserToEdit(null);
      setIsEditSaving(false);
      setSuccessMessage(`${name}'s role updated to ${editRole}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setIsEditSaving(false);
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleResendInvite = async (user: User) => {
    try {
      await resendInvite(user.id);
      setSuccessMessage(`Invitation resent to ${user.email}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invitation");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users in your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/admin/students/import">
              <Upload className="h-4 w-4 mr-2" />
              Import Students
            </a>
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Quick Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Subscription Limit Warnings */}
      {instructorAtLimit && limits.instructors !== -1 && (
        <LimitReachedAlert
          type="instructor"
          current={usage.instructorCount}
          limit={limits.instructors}
          tier={tier}
          isAdmin
        />
      )}
      {studentAtLimit && limits.students !== -1 && (
        <LimitReachedAlert
          type="student"
          current={usage.studentCount}
          limit={limits.students}
          tier={tier}
          isAdmin
        />
      )}
      {instructorWarning && limits.instructors !== -1 && (
        <LimitWarningBanner
          type="instructor"
          current={usage.instructorCount}
          limit={limits.instructors}
        />
      )}
      {studentWarning && limits.students !== -1 && (
        <LimitWarningBanner
          type="student"
          current={usage.studentCount}
          limit={limits.students}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {["admin", "instructor", "student"].map((role) => {
          const count = users.filter((u) => u.role === role).length;
          const limit =
            role === "instructor"
              ? limits.instructors
              : role === "student"
              ? limits.students
              : -1;
          const atLimit = limit !== -1 && count >= limit;
          const colors: Record<string, string> = {
            admin: "bg-error/10 text-error",
            instructor: atLimit ? "bg-error/10 text-error" : "bg-info/10 text-info",
            student: atLimit ? "bg-error/10 text-error" : "bg-success/10 text-success",
          };
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors[role]}`}>
                    {atLimit ? <Lock className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground capitalize">{role}s</p>
                    <p className="text-2xl font-bold">
                      {count}
                      {limit !== -1 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /{limit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              className="w-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">User</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Joined</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatar_url || undefined}
                            fallback={user.full_name || user.email}
                            size="sm"
                          />
                          <span className="font-medium">{user.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "destructive"
                              : user.role === "instructor"
                              ? "info"
                              : "success"
                          }
                          className="capitalize"
                        >
                          {user.role || "—"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.is_active !== false ? "success" : "secondary"}>
                          {user.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(user)}
                            disabled={isResending}
                            title="Resend invitation email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Edit role"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserActive(user)}
                          >
                            {user.is_active !== false ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-destructive hover:text-destructive"
                            title="Permanently delete user"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="space-y-2">
            <Label required>Email</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label required>Full Name</Label>
            <Input
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label required>Role</Label>
            <Select
              options={[
                { value: "student", label: "Student" },
                { value: "instructor", label: "Instructor" },
                { value: "admin", label: "Admin" },
              ]}
              value={newUser.role}
              onChange={(val) => setNewUser({ ...newUser, role: val as UserRole })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Link Modal (shown when email rate limit is hit) */}
      <Modal
        isOpen={!!inviteLink}
        onClose={() => setInviteLink(null)}
        title="Share Invite Link Manually"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            The email rate limit was reached. Copy this link and send it to <strong>{inviteLink?.email}</strong> directly.
          </Alert>
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteLink?.url ?? ""}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (inviteLink?.url) {
                    navigator.clipboard.writeText(inviteLink.url);
                    setSuccessMessage("Link copied to clipboard");
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This link is single-use and expires in 24 hours. The user will be prompted to set a password after clicking it.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setInviteLink(null)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setCsvData([]);
          setCsvError(null);
          setImportResults(null);
        }}
        title="Bulk Import Users"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with user data
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Click to upload CSV</p>
              <p className="text-sm text-muted-foreground">
                Required columns: email, name, role
              </p>
            </label>
          </div>

          {csvError && (
            <Alert variant="error">
              {csvError}
            </Alert>
          )}

          {csvData.length > 0 && !importResults && (
            <div className="space-y-3">
              <p className="font-medium">
                {csvData.length} users ready to import:
              </p>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((user, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3">{user.email}</td>
                        <td className="py-2 px-3">{user.full_name || "—"}</td>
                        <td className="py-2 px-3 capitalize">{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importResults && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {importResults.filter((r) => r.success).length} imported
                </Badge>
                {importResults.filter((r) => !r.success).length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {importResults.filter((r) => !r.success).length} failed
                  </Badge>
                )}
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((result, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3">{result.email}</td>
                        <td className="py-2 px-3">
                          {result.success ? (
                            <span className="text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Imported
                            </span>
                          ) : (
                            <span className="text-error flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {result.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setCsvData([]);
                setCsvError(null);
                setImportResults(null);
              }}
            >
              {importResults ? "Close" : "Cancel"}
            </Button>
            {csvData.length > 0 && !importResults && (
              <Button onClick={handleBulkImport} isLoading={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                Import {csvData.length} Users
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        type={upgradeModalType}
        currentTier={tier}
      />

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setUserToEdit(null); }}
        title="Edit User Role"
      >
        {userToEdit && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar
                  src={userToEdit.avatar_url || undefined}
                  fallback={userToEdit.full_name || userToEdit.email}
                  size="sm"
                />
                <div>
                  <p className="font-medium">{userToEdit.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{userToEdit.email}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Role</Label>
              <Select
                options={[
                  { value: "student", label: "Student" },
                  { value: "instructor", label: "Instructor" },
                  { value: "admin", label: "Admin" },
                ]}
                value={editRole}
                onChange={(val) => setEditRole(val as UserRole)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setUserToEdit(null); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} isLoading={isEditSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-sm">
                This will permanently delete the user from your organization and remove their
                authentication account. They will need to be re-invited to regain access.
              </p>
            </div>
          </Alert>

          {userToDelete && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar
                  src={userToDelete.avatar_url || undefined}
                  fallback={userToDelete.full_name || userToDelete.email}
                  size="sm"
                />
                <div>
                  <p className="font-medium">{userToDelete.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              isLoading={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

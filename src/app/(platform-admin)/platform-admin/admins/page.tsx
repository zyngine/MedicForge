"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Input,
  Label,
  Modal,
  Alert,
} from "@/components/ui";
import {
  Shield,
  UserPlus,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  Key,
} from "lucide-react";
import { format } from "date-fns";

interface PlatformAdmin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user?: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAdmins = async () => {
    const supabase = createClient();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("platform_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Note: We can't fetch user details directly due to auth schema restrictions
      // The admin would need to use the auth admin API for full details
      setAdmins(data || []);
    } catch (err) {
      console.error("Error fetching admins:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      // Note: Creating new admin users requires the service role key
      // This would typically be done via a server-side API route
      setError("Adding new admins requires server-side API. Contact system administrator.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add admin");
    } finally {
      setIsAdding(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Administrators</h1>
          <p className="text-muted-foreground mt-1">
            Manage MedicForge platform admin access
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {admin.user?.user_metadata?.full_name || "Platform Admin"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        {admin.user_id.substring(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added {format(new Date(admin.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(admin.role)}>
                    {admin.role.replace("_", " ")}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {admins.length === 0 && (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No administrators found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Important Security Notes</h4>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Platform admins have full access to all tenant data</li>
                <li>Use strong, unique passwords for admin accounts</li>
                <li>Enable two-factor authentication when available</li>
                <li>Regularly audit admin access and remove unused accounts</li>
                <li>Admin actions are logged for security compliance</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Admin Roles</h4>
              <ul className="space-y-2 text-blue-700">
                <li><strong>Super Admin:</strong> Full platform access including admin management</li>
                <li><strong>Admin:</strong> Can manage tenants and users but not other admins</li>
                <li><strong>Support:</strong> Read-only access for troubleshooting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setError(null);
          setNewAdminEmail("");
          setNewAdminPassword("");
          setNewAdminName("");
        }}
        title="Add Platform Administrator"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@medicforge.net"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Strong password"
              required
              minLength={12}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 12 characters with mixed case, numbers, and symbols
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdding}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Administrator
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Spinner,
} from "@/components/ui";
import {
  Users,
  Search,
  MoreVertical,
  GraduationCap,
  UserCog,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function AllUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            email,
            full_name,
            role,
            is_active,
            created_at,
            tenant:tenants(id, name, slug)
          `)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = !roleFilter || (user.role && user.role === roleFilter);

    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "instructor":
        return <UserCog className="h-4 w-4" />;
      case "student":
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "instructor":
        return "secondary";
      case "student":
        return "outline";
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

  const roleCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    instructor: users.filter((u) => u.role === "instructor").length,
    student: users.filter((u) => u.role === "student" || !u.role).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">All Users</h1>
        <p className="text-muted-foreground mt-1">
          View and manage users across all institutions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={roleFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter(null)}
          >
            All ({roleCounts.all})
          </Button>
          <Button
            variant={roleFilter === "admin" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("admin")}
          >
            Admins ({roleCounts.admin})
          </Button>
          <Button
            variant={roleFilter === "instructor" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("instructor")}
          >
            Instructors ({roleCounts.instructor})
          </Button>
          <Button
            variant={roleFilter === "student" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("student")}
          >
            Students ({roleCounts.student})
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role || "student")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name}</p>
                      {!user.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.tenant && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.tenant.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant={getRoleBadgeVariant(user.role || "student")}>
                      {user.role || "student"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter
                  ? "Try adjusting your search or filters"
                  : "No users have registered yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

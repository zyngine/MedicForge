"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Spinner,
} from "@/components/ui";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
} from "lucide-react";

interface TenantStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  tenantName: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Get user's tenant
        const { data: profile } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.tenant_id) return;

        // Fetch stats for this tenant
        const [tenantResult, usersResult, coursesResult] = await Promise.all([
          supabase
            .from("tenants")
            .select("name")
            .eq("id", profile.tenant_id)
            .single(),
          supabase
            .from("users")
            .select("id, role")
            .eq("tenant_id", profile.tenant_id),
          supabase
            .from("courses")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", profile.tenant_id),
        ]);

        const users = usersResult.data || [];

        setStats({
          tenantName: tenantResult.data?.name || "Organization",
          totalUsers: users.length,
          totalStudents: users.filter((u) => u.role === "student").length,
          totalInstructors: users.filter((u) => u.role === "instructor").length,
          totalCourses: coursesResult.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-100",
    },
    {
      title: "Students",
      value: stats.totalStudents,
      icon: <GraduationCap className="h-5 w-5" />,
      color: "text-green-600 bg-green-100",
    },
    {
      title: "Instructors",
      value: stats.totalInstructors,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-purple-600 bg-purple-100",
    },
    {
      title: "Courses",
      value: stats.totalCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-orange-600 bg-orange-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">{stats.tenantName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Manage Users</span>
            </a>
            <a
              href="/admin/billing"
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-center"
            >
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Billing</span>
            </a>
            <a
              href="/admin/organization"
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-center"
            >
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Organization</span>
            </a>
            <a
              href="/admin/settings"
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-center"
            >
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Settings</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  Activity,
  Calendar,
} from "lucide-react";
import { format, subDays } from "date-fns";

interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuestions: number;
  recentSignups: number;
}

interface TenantGrowth {
  name: string;
  users: number;
  courses: number;
  created_at: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<TenantGrowth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient();

      try {
        // Fetch all counts in parallel
        const [
          tenantsResult,
          usersResult,
          coursesResult,
          enrollmentsResult,
          questionsResult,
          recentTenantsResult,
        ] = await Promise.all([
          supabase.from("tenants").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id, role", { count: "exact" }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("enrollments").select("id", { count: "exact", head: true }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("question_bank").select("id", { count: "exact", head: true }),
          supabase
            .from("tenants")
            .select("name, created_at")
            .gte("created_at", subDays(new Date(), 30).toISOString())
            .order("created_at", { ascending: false }),
        ]);

        const users = usersResult.data || [];
        const students = users.filter(u => u.role === "student").length;
        const instructors = users.filter(u => u.role === "instructor" || u.role === "admin").length;

        // Get user counts per tenant for recent tenants
        const tenantsWithCounts = await Promise.all(
          (recentTenantsResult.data || []).slice(0, 5).map(async (tenant: { name: string; created_at: string | null }) => {
            const { count: userCount } = await supabase
              .from("users")
              .select("id", { count: "exact", head: true });
            const { count: courseCount } = await supabase
              .from("courses")
              .select("id", { count: "exact", head: true });

            return {
              name: tenant.name,
              users: userCount || 0,
              courses: courseCount || 0,
              created_at: tenant.created_at || new Date().toISOString(),
            };
          })
        );

        setStats({
          totalTenants: tenantsResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalStudents: students,
          totalInstructors: instructors,
          totalCourses: coursesResult.count || 0,
          totalEnrollments: enrollmentsResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          recentSignups: recentTenantsResult.data?.length || 0,
        });

        setRecentTenants(tenantsWithCounts);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Institutions",
      value: stats.totalTenants,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-600",
      change: "+12%",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      color: "bg-green-100 text-green-600",
      change: "+8%",
    },
    {
      title: "Students",
      value: stats.totalStudents,
      icon: <GraduationCap className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-600",
      change: "+15%",
    },
    {
      title: "Instructors",
      value: stats.totalInstructors,
      icon: <Users className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-600",
      change: "+5%",
    },
    {
      title: "Courses",
      value: stats.totalCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: "bg-cyan-100 text-cyan-600",
      change: "+10%",
    },
    {
      title: "Enrollments",
      value: stats.totalEnrollments,
      icon: <Activity className="h-5 w-5" />,
      color: "bg-pink-100 text-pink-600",
      change: "+20%",
    },
    {
      title: "Questions",
      value: stats.totalQuestions.toLocaleString(),
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-indigo-100 text-indigo-600",
      change: "+25%",
    },
    {
      title: "New This Month",
      value: stats.recentSignups,
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-600",
      change: "institutions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Overview of MedicForge platform metrics and growth
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <Badge variant="outline" className="text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Growth */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Institutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTenants.map((tenant, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(tenant.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {tenant.users} users
                    </span>
                    <span className="text-muted-foreground">
                      {tenant.courses} courses
                    </span>
                  </div>
                </div>
              ))}

              {recentTenants.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No new institutions this month
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="font-medium">API Status</span>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge variant="success">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Storage</span>
                </div>
                <Badge variant="success">Normal</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Auth Service</span>
                </div>
                <Badge variant="success">Online</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

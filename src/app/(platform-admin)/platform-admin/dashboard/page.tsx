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
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalCourses: number;
  totalStudents: number;
  activeSubscriptions: number;
  trialTenants: number;
  monthlyRevenue: number;
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_tier: string | null;
    subscription_status: string | null;
    created_at: string | null;
  }>;
}

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Fetch all stats in parallel
        const [
          tenantsResult,
          usersResult,
          coursesResult,
          recentTenantsResult,
        ] = await Promise.all([
          supabase.from("tenants").select("id, subscription_tier, subscription_status", { count: "exact" }),
          supabase.from("users").select("id, role", { count: "exact" }),
          supabase.from("courses").select("id", { count: "exact" }),
          supabase
            .from("tenants")
            .select("id, name, slug, subscription_tier, subscription_status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const tenants = tenantsResult.data || [];
        const users = usersResult.data || [];

        // Calculate stats
        const activeSubscriptions = tenants.filter(
          (t) => t.subscription_status === "active" && t.subscription_tier !== "free"
        ).length;

        const trialTenants = tenants.filter(
          (t) => t.subscription_status === "trialing"
        ).length;

        const students = users.filter((u) => u.role === "student").length;

        // Calculate estimated monthly revenue
        const tierPrices: Record<string, number> = {
          free: 0,
          pro: 99,
          institution: 299,
          enterprise: 999, // estimate
        };
        const monthlyRevenue = tenants
          .filter((t) => t.subscription_status === "active")
          .reduce((sum, t) => sum + (tierPrices[t.subscription_tier || "free"] || 0), 0);

        setStats({
          totalTenants: tenantsResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalStudents: students,
          activeSubscriptions,
          trialTenants,
          monthlyRevenue,
          recentTenants: recentTenantsResult.data || [],
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Institutions",
      value: stats.totalTenants,
      icon: <Building2 className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-100",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      color: "text-green-600 bg-green-100",
    },
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: <GraduationCap className="h-5 w-5" />,
      color: "text-purple-600 bg-purple-100",
    },
    {
      title: "Total Courses",
      value: stats.totalCourses,
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-orange-600 bg-orange-100",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: <CheckCircle className="h-5 w-5" />,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      title: "Trial Accounts",
      value: stats.trialTenants,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "text-amber-600 bg-amber-100",
    },
    {
      title: "Est. MRR",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-green-600 bg-green-100",
    },
    {
      title: "Growth",
      value: "+12%",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-100",
    },
  ];

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return "default";
      case "institution":
        return "secondary";
      case "pro":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "trialing":
        return "warning";
      case "canceled":
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all MedicForge institutions and metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Institutions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Institutions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.slug}.medicforge.net
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getTierBadgeVariant(tenant.subscription_tier || "free")}>
                    {tenant.subscription_tier || "free"}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(tenant.subscription_status || "trialing")}>
                    {tenant.subscription_status || "trialing"}
                  </Badge>
                </div>
              </div>
            ))}

            {stats.recentTenants.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No institutions yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

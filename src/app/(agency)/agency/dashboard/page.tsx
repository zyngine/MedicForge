"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  Users,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencyStats } from "@/lib/hooks/use-agency-data";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "error";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {trend && trendValue && (
              <p className={`text-xs mt-1 ${trend === "up" ? "text-success" : "text-error"}`}>
                {trend === "up" ? "+" : "-"}{trendValue} from last month
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgencyDashboardPage() {
  const { tenant } = useTenant();
  const { isAgencyAdmin, isMedicalDirector } = useAgencyRole();
  const { stats, recentActivity, isLoading } = useAgencyStats();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isMedicalDirector ? "Medical Director Dashboard" : "Agency Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isMedicalDirector
              ? "Review and verify employee competencies"
              : "Manage workforce competencies and verifications"}
          </p>
        </div>
        <div className="flex gap-2">
          {isAgencyAdmin && (
            <>
              <Button variant="outline" asChild>
                <Link href="/agency/cycles/new">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Cycle
                </Link>
              </Button>
              <Button asChild>
                <Link href="/agency/employees/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees ?? 0}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Pending Verifications"
          value={stats?.pendingVerifications ?? 0}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Completed This Cycle"
          value={stats?.completedThisCycle ?? 0}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Upcoming Expirations"
          value={stats?.upcomingExpirations ?? 0}
          icon={AlertTriangle}
          color="error"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Current Cycle Progress</CardTitle>
            <CardDescription>Annual 2025 Verification Cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm text-muted-foreground">{stats?.verificationRate ?? 0}%</span>
              </div>
              <Progress value={stats?.verificationRate ?? 0} className="h-3" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{stats?.completedThisCycle ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">{stats?.pendingVerifications ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest competency updates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/agency/audit-log">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {entry.action.replace(/_/g, " ")}
                      </p>
                      {entry.performed_by_name && (
                        <p className="text-xs text-muted-foreground">
                          By {entry.performed_by_name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isMedicalDirector && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Review</CardTitle>
            <CardDescription>Competencies awaiting Medical Director verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{stats?.pendingVerifications ?? 0} Pending Verifications</p>
                  <p className="text-sm text-muted-foreground">
                    Employee competencies ready for your sign-off
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/agency/medical-directors/pending">
                  Review Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts for Admin */}
      {isAgencyAdmin && (stats?.upcomingExpirations ?? 0) > 0 && (
        <Card className="border-warning/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Expiring Competencies</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.upcomingExpirations ?? 0} employee competencies expire within 30 days
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/agency/employees?filter=expiring">
                  View Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  ShieldCheck,
  ClipboardList,
  CalendarCheck,
  CheckCircle,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencyStats } from "@/lib/hooks/use-agency-data";
import { useUser } from "@/lib/hooks/use-user";

interface RecentVerification {
  id: string;
  skill?: { name: string } | null;
  employee?: { first_name: string; last_name: string } | null;
  verified_at?: string | null;
  updated_at: string;
}

function useRecentVerifications() {
  const [verifications, setVerifications] = React.useState<RecentVerification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/agency/verifications?status=verified&limit=20")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RecentVerification[]) => {
        if (!cancelled) setVerifications(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setVerifications([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { verifications, isLoading };
}

export default function MDDashboardPage() {
  const { isMedicalDirector, isLoading: roleLoading } = useAgencyRole();
  const { profile } = useUser();
  const { stats, isLoading: statsLoading } = useAgencyStats();
  const { verifications: recentVerifications, isLoading: verificationsLoading } =
    useRecentVerifications();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isMedicalDirector) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              This dashboard is only available to Medical Directors.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mdName = profile?.full_name ?? "Medical Director";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {mdName}</h1>
          <p className="text-muted-foreground">Medical Director Dashboard</p>
        </div>
        <Badge variant="outline" className="w-fit">
          Medical Director
        </Badge>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex items-center justify-center h-24">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Total Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats?.completedThisCycle ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Verified this cycle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-warning" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats?.pendingVerifications ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {recentVerifications.length > 0
                  ? recentVerifications.filter((v) => {
                      const date = new Date(v.verified_at ?? v.updated_at);
                      const now = new Date();
                      return (
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                      );
                    }).length
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Verifications this month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Verifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {verificationsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Spinner size="md" />
            </div>
          ) : recentVerifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No verified competencies yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {recentVerifications.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">
                      {v.skill?.name ?? "Unknown Skill"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" />
                      {v.employee
                        ? `${v.employee.first_name} ${v.employee.last_name}`
                        : "Unknown Employee"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-4 shrink-0">
                    <Calendar className="h-3 w-3" />
                    {new Date(v.verified_at ?? v.updated_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Action */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Ready to review?</p>
            <p className="text-sm text-muted-foreground">
              {stats?.pendingVerifications
                ? `${stats.pendingVerifications} verification${stats.pendingVerifications === 1 ? "" : "s"} awaiting your sign-off.`
                : "Check for pending competency submissions."}
            </p>
          </div>
          <Button asChild>
            <Link href="/agency/medical-directors/pending">
              Review Pending Verifications
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

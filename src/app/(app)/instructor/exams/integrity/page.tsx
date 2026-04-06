"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import {
  useFlaggedAttempts,
  getDecisionBadgeVariant,
  getDecisionLabel,
} from "@/lib/hooks/use-integrity-monitoring";
import { format } from "date-fns";

export default function IntegrityReviewPage() {
  const [filter, setFilter] = React.useState<"pending" | "reviewed" | "all">("pending");
  const { data: attempts = [], isLoading } = useFlaggedAttempts({
    reviewed: filter === "all" ? undefined : filter === "reviewed",
  });

  // Stats
  const stats = React.useMemo(() => {
    const pending = attempts.filter((a) => !a.reviewed).length;
    const reviewed = attempts.filter((a) => a.reviewed).length;
    const violations = attempts.filter((a) => a.review_decision === "violation").length;
    const warnings = attempts.filter((a) => a.review_decision === "warning").length;
    const cleared = attempts.filter((a) => a.review_decision === "cleared").length;
    return { pending, reviewed, violations, warnings, cleared, total: attempts.length };
  }, [attempts]);

  // Filter attempts based on tab
  const filteredAttempts = React.useMemo(() => {
    switch (filter) {
      case "pending":
        return attempts.filter((a) => !a.reviewed);
      case "reviewed":
        return attempts.filter((a) => a.reviewed);
      default:
        return attempts;
    }
  }, [attempts, filter]);

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-7 w-7" />
          Academic Integrity Review
        </h1>
        <p className="text-muted-foreground">
          Review flagged exam attempts for potential academic integrity issues
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cleared}</p>
                <p className="text-xs text-muted-foreground">Cleared</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.violations}</p>
                <p className="text-xs text-muted-foreground">Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Flagged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="pending" value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({stats.reviewed})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Flagged Attempts List */}
      {filteredAttempts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">
              {filter === "pending" ? "No Pending Reviews" : "No Flagged Attempts"}
            </h3>
            <p className="text-muted-foreground">
              {filter === "pending"
                ? "All flagged attempts have been reviewed."
                : "No exam attempts have been flagged for review."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Flagged Attempts</CardTitle>
            <CardDescription>
              Click on an attempt to review the integrity events in detail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredAttempts.map((attempt) => (
                <Link
                  key={attempt.attempt_id}
                  href={`/instructor/exams/integrity/${attempt.attempt_id}`}
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        attempt.reviewed
                          ? attempt.review_decision === "violation"
                            ? "bg-red-100 text-red-600"
                            : attempt.review_decision === "warning"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}>
                        {attempt.reviewed ? (
                          attempt.review_decision === "violation" ? (
                            <ShieldAlert className="h-5 w-5" />
                          ) : attempt.review_decision === "warning" ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <ShieldCheck className="h-5 w-5" />
                          )
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{attempt.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.exam_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.flagged_at && format(new Date(attempt.flagged_at), "MMM d, yyyy h:mm a")}
                          {attempt.auto_flagged && " • Auto-flagged"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {attempt.high_suspicion_events > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {attempt.high_suspicion_events} high
                            </Badge>
                          )}
                          {attempt.medium_suspicion_events > 0 && (
                            <Badge variant="warning" className="text-xs">
                              {attempt.medium_suspicion_events} medium
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {attempt.total_events} events
                          </Badge>
                        </div>
                        {attempt.reviewed && (
                          <div className="mt-1">
                            <Badge variant={getDecisionBadgeVariant(attempt.review_decision)}>
                              {getDecisionLabel(attempt.review_decision)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

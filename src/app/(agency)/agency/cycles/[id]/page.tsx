"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Progress,
} from "@/components/ui";
import {
  ArrowLeft,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle,
  Clock,
  ListChecks,
  BarChart3,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import {
  useCycleDetail,
  useGenerateCompetencies,
  useLockCycle,
} from "@/lib/hooks/use-cycle-detail";

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CYCLE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual",
  biannual: "Biannual",
  quarterly: "Quarterly",
  monthly: "Monthly",
  custom: "Custom",
};

function cycleTypeVariant(
  type: string
): "default" | "secondary" | "info" | "warning" | "outline" {
  const map: Record<string, "default" | "secondary" | "info" | "warning" | "outline"> = {
    annual: "default",
    biannual: "info",
    quarterly: "secondary",
    monthly: "warning",
    custom: "outline",
  };
  return map[type] ?? "outline";
}

function completionVariant(pct: number): "success" | "warning" | "error" | "default" {
  if (pct >= 80) return "success";
  if (pct >= 40) return "warning";
  if (pct > 0) return "error";
  return "default";
}

// ── stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  footer?: React.ReactNode;
}

function StatCard({ title, value, icon, accent, footer }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className={`text-3xl font-bold ${accent ?? ""}`}>{value}</p>
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function CycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cycleId = params.id as string;

  const { isAgencyAdmin } = useAgencyRole();
  const { data, isLoading, error } = useCycleDetail(cycleId);
  const generateMutation = useGenerateCompetencies(cycleId);
  const lockMutation = useLockCycle(cycleId);

  const [generateMessage, setGenerateMessage] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // ── generate handler ─────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerateMessage(null);
    setActionError(null);
    try {
      const result = await generateMutation.mutateAsync({});
      const count: number = result?.generated ?? result?.count ?? 0;
      setGenerateMessage(
        count === 0
          ? "No new competency records were generated."
          : `Generated ${count} competency record${count !== 1 ? "s" : ""}.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to generate competencies.");
    }
  }

  // ── lock handler ─────────────────────────────────────────────────────────────

  async function handleLockToggle() {
    if (!data) return;
    setActionError(null);
    try {
      await lockMutation.mutateAsync(!data.cycle.is_locked);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update lock status.");
    }
  }

  // ── loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/agency/cycles")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cycles
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-error opacity-70" />
            <p className="text-base font-medium">
              {error instanceof Error ? error.message : "Failed to load cycle details."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/agency/cycles")}
            >
              Return to Cycles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { cycle, employees, stats } = data;

  const sortedEmployees = [...employees].sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  );

  const isMutating = generateMutation.isPending || lockMutation.isPending;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2"
            onClick={() => router.push("/agency/cycles")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cycles
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{cycle.name}</h1>

            <Badge variant={cycleTypeVariant(cycle.cycle_type)}>
              {CYCLE_TYPE_LABELS[cycle.cycle_type] ?? cycle.cycle_type}
            </Badge>

            {cycle.is_locked && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {formatDate(cycle.start_date)} &ndash; {formatDate(cycle.end_date)}
          </p>
        </div>

        {/* ── Admin action buttons ── */}
        {isAgencyAdmin && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isMutating}
            >
              {generateMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generate Competencies
            </Button>

            <Button
              variant={cycle.is_locked ? "outline" : "secondary"}
              size="sm"
              onClick={handleLockToggle}
              disabled={isMutating}
            >
              {lockMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : cycle.is_locked ? (
                <Unlock className="h-4 w-4 mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {cycle.is_locked ? "Unlock Cycle" : "Lock Cycle"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Feedback messages ── */}
      {generateMessage && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {generateMessage}
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <XCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Competencies"
          value={stats.totalCompetencies}
          icon={<ListChecks className="h-5 w-5" />}
        />

        <StatCard
          title="Verified"
          value={stats.verified}
          icon={<CheckCircle className="h-5 w-5 text-success" />}
          accent="text-success"
        />

        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-warning" />}
          accent="text-warning"
        />

        <StatCard
          title="Completion"
          value={`${Math.round(stats.completion)}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          footer={
            <Progress
              value={stats.completion}
              size="sm"
              variant={completionVariant(stats.completion)}
            />
          }
        />
      </div>

      {/* ── Employee Progress Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedEmployees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No employees found for this cycle.</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_repeat(4,_1fr)_1.5fr] gap-4 px-4 py-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Name</span>
                <span>Cert Level</span>
                <span className="text-right">Total</span>
                <span className="text-right">Verified</span>
                <span className="text-right">Pending</span>
                <span className="text-right">Failed</span>
                <span>Completion</span>
              </div>

              {/* Rows */}
              {sortedEmployees.map((emp) => (
                <Link
                  key={emp.id}
                  href={`/agency/employees/${emp.id}?cycle=${cycleId}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors last:border-b-0">
                    {/* Mobile layout stacks, desktop uses grid */}
                    <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_repeat(4,_1fr)_1.5fr] sm:gap-4 sm:items-center w-full">
                      {/* Name */}
                      <span className="font-medium truncate">
                        {emp.last_name}, {emp.first_name}
                      </span>

                      {/* Cert level */}
                      <span className="text-sm text-muted-foreground truncate">
                        {emp.certification_level || "—"}
                      </span>

                      {/* Counts */}
                      <span className="text-sm text-right">{emp.total}</span>
                      <span className="text-sm text-right text-success font-medium">
                        {emp.verified}
                      </span>
                      <span className="text-sm text-right text-warning font-medium">
                        {emp.pending}
                      </span>
                      <span className="text-sm text-right text-error font-medium">
                        {emp.failed}
                      </span>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <Progress
                          value={emp.completion}
                          size="sm"
                          variant={completionVariant(emp.completion)}
                          className="flex-1"
                        />
                        <span className="text-xs font-medium w-9 text-right shrink-0">
                          {Math.round(emp.completion)}%
                        </span>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="sm:hidden w-full space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {emp.last_name}, {emp.first_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {emp.certification_level || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Progress
                          value={emp.completion}
                          size="sm"
                          variant={completionVariant(emp.completion)}
                          className="flex-1"
                        />
                        <span className="text-xs font-medium w-9 text-right shrink-0">
                          {Math.round(emp.completion)}%
                        </span>
                      </div>

                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Total: <strong>{emp.total}</strong></span>
                        <span className="text-success">Verified: <strong>{emp.verified}</strong></span>
                        <span className="text-warning">Pending: <strong>{emp.pending}</strong></span>
                        <span className="text-error">Failed: <strong>{emp.failed}</strong></span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

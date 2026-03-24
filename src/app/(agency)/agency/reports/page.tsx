"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Select,
} from "@/components/ui";
import {
  BarChart3,
  Download,
  FileText,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface ComplianceRow {
  name: string;
  certification_level: string;
  certification_expiration: string | null;
  total_skills: number;
  verified: number;
  pending: number;
  failed: number;
  completion: number;
}

interface ExpiringRow {
  id: string;
  first_name: string;
  last_name: string;
  certification_level: string;
  certification_expiration: string | null;
  email: string | null;
}

interface ReportData {
  rows: ComplianceRow[] | ExpiringRow[];
  type: "compliance" | "expiring";
}

type ReportType = "compliance" | "expiring";

const DAYS_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
];

// ─── CSV Download ─────────────────────────────────────────────────────────────

async function downloadCSV(
  type: ReportType,
  selectedCycleId: string,
  daysAhead: number
) {
  const params = new URLSearchParams({ type, format: "csv" });
  if (type === "compliance" && selectedCycleId) params.set("cycle_id", selectedCycleId);
  if (type === "expiring") params.set("days", daysAhead.toString());
  const res = await fetch(`/api/agency/reports?${params}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ComplianceTable({ rows }: { rows: ComplianceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No employees found for this report.</p>
      </div>
    );
  }

  const avgCompletion =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.completion, 0) / rows.length)
      : 0;

  return (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
            <p className="text-lg font-bold">{rows.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <BarChart3 className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. Completion</p>
            <p className="text-lg font-bold">{avgCompletion}%</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Cert Level</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Total Skills</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Verified</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Pending</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Failed</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Completion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{row.certification_level}</Badge>
                </td>
                <td className="px-4 py-3 text-center">{row.total_skills}</td>
                <td className="px-4 py-3 text-center text-success font-medium">{row.verified}</td>
                <td className="px-4 py-3 text-center text-warning font-medium">{row.pending}</td>
                <td className="px-4 py-3 text-center text-destructive font-medium">{row.failed}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      row.completion >= 80
                        ? "text-success font-semibold"
                        : row.completion >= 50
                        ? "text-warning font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {row.completion}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ExpiringTable({ rows }: { rows: ExpiringRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No expiring certifications found for this period.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary stat */}
      <div className="grid grid-cols-1 gap-4 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiring Employees</p>
            <p className="text-lg font-bold">{rows.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Cert Level</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Expiration Date</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const expDate = row.certification_expiration
                ? new Date(row.certification_expiration)
                : null;
              const isPast = expDate ? expDate < new Date() : false;

              return (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {row.last_name}, {row.first_name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{row.certification_level}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {expDate ? (
                      <span className={isPast ? "text-destructive font-medium" : "text-warning font-medium"}>
                        {expDate.toLocaleDateString()}
                        {isPast && " (Expired)"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.email || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const [reportType, setReportType] = React.useState<ReportType>("compliance");
  const [selectedCycleId, setSelectedCycleId] = React.useState<string>("");
  const [daysAhead, setDaysAhead] = React.useState<number>(90);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Fetch cycles for the compliance filter dropdown
  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ["agency-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/agency/cycles");
      if (!res.ok) throw new Error("Failed to fetch cycles");
      return res.json();
    },
    enabled: isAgencyAdmin,
  });

  // Build report query params
  const reportParams = React.useMemo(() => {
    const params = new URLSearchParams({ type: reportType, format: "json" });
    if (reportType === "compliance" && selectedCycleId) {
      params.set("cycle_id", selectedCycleId);
    }
    if (reportType === "expiring") {
      params.set("days", daysAhead.toString());
    }
    return params.toString();
  }, [reportType, selectedCycleId, daysAhead]);

  // Fetch report data
  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery<ReportData>({
    queryKey: ["agency-report", reportType, selectedCycleId, daysAhead],
    queryFn: async () => {
      const res = await fetch(`/api/agency/reports?${reportParams}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      return res.json();
    },
    enabled: isAgencyAdmin,
  });

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      await downloadCSV(reportType, selectedCycleId, daysAhead);
    } finally {
      setIsDownloading(false);
    }
  };

  // Admin-only gate
  if (!isAgencyAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Reports are available to agency admins only.</p>
        </div>
      </div>
    );
  }

  const cycleOptions = [
    { value: "", label: "All Cycles" },
    ...cycles.map((c) => ({ value: c.id, label: c.name })),
  ];

  const complianceRows = reportData?.type === "compliance"
    ? (reportData.rows as ComplianceRow[])
    : [];

  const expiringRows = reportData?.type === "expiring"
    ? (reportData.rows as ExpiringRow[])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Export and review agency compliance data
          </p>
        </div>
        <Button
          onClick={handleDownloadCSV}
          disabled={isDownloading || reportLoading}
          variant="outline"
        >
          {isDownloading ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Report Type Selector + Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Report Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report type tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setReportType("compliance")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === "compliance"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              Compliance Summary
            </button>
            <button
              onClick={() => setReportType("expiring")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === "expiring"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              Expiring Certifications
            </button>
          </div>

          {/* Filters */}
          {reportType === "compliance" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 max-w-xs">
                <p className="text-xs text-muted-foreground mb-1">Verification Cycle</p>
                <Select
                  value={selectedCycleId}
                  onChange={setSelectedCycleId}
                  options={cycleOptions}
                />
              </div>
            </div>
          )}

          {reportType === "expiring" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 max-w-xs">
                <p className="text-xs text-muted-foreground mb-1">Expiring Within</p>
                <Select
                  value={daysAhead.toString()}
                  onChange={(v) => setDaysAhead(parseInt(v))}
                  options={DAYS_OPTIONS}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {reportType === "compliance" ? (
                <>
                  <FileText className="h-5 w-5" />
                  Compliance Summary
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Expiring Certifications
                </>
              )}
            </CardTitle>
            {!reportLoading && reportData && (
              <span className="text-sm text-muted-foreground">
                {reportData.rows.length} employee{reportData.rows.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {reportLoading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size="lg" />
            </div>
          ) : reportError ? (
            <div className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
              <p className="text-destructive font-medium">Failed to load report data.</p>
              <p className="text-sm mt-1">Please try again or contact support if the issue persists.</p>
            </div>
          ) : reportType === "compliance" ? (
            <ComplianceTable rows={complianceRows} />
          ) : (
            <ExpiringTable rows={expiringRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

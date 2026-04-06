"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Spinner,
  Select,
} from "@/components/ui";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  UserPlus,
  Trash2,
  Edit,
  RefreshCw,
} from "lucide-react";
import { useAgencyAuditLog } from "@/lib/hooks/use-agency-data";
import type { AuditLogEntry } from "@/lib/hooks/use-agency-data";

const ACTION_ICONS: Record<string, React.ElementType> = {
  verification_approved: CheckCircle,
  verification_rejected: XCircle,
  employee_added: UserPlus,
  employee_deactivated: Trash2,
  skill_updated: Edit,
  cycle_created: RefreshCw,
};

const ACTION_COLORS: Record<string, string> = {
  verification_approved: "text-success bg-success/10",
  verification_rejected: "text-destructive bg-destructive/10",
  employee_added: "text-primary bg-primary/10",
  employee_deactivated: "text-muted-foreground bg-muted",
  skill_updated: "text-warning bg-warning/10",
  cycle_created: "text-info bg-info/10",
};

const ACTION_LABELS: Record<string, string> = {
  verification_approved: "Verification Approved",
  verification_rejected: "Verification Rejected",
  employee_added: "Employee Added",
  employee_deactivated: "Employee Deactivated",
  skill_updated: "Skill Updated",
  cycle_created: "Cycle Created",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const truncate = (val: any) => {
  const str = String(val ?? "");
  return str.length > 100 ? str.slice(0, 100) + "..." : str;
};

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const Icon = ACTION_ICONS[entry.action] || FileText;
  const colorClass = ACTION_COLORS[entry.action] || "text-muted-foreground bg-muted";
  const label = ACTION_LABELS[entry.action] || entry.action.replace(/_/g, " ");

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium capitalize">{label}</p>
          <Badge variant="secondary" className="text-xs">
            {entry.entity_type}
          </Badge>
        </div>
        {entry.performed_by_name && (
          <p className="text-sm text-muted-foreground mt-1">
            By {entry.performed_by_name}
          </p>
        )}
        {entry.new_values && Object.keys(entry.new_values).length > 0 && (
          <p className="text-sm text-muted-foreground mt-1 italic">
            {Object.entries(entry.new_values)
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${truncate(v)}`)
              .join(", ")}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(entry.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const { entries, isLoading } = useAgencyAuditLog();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");

  const filteredLogs = React.useMemo(() => {
    return entries.filter((entry) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.action.toLowerCase().includes(query) &&
          !(entry.performed_by_name?.toLowerCase().includes(query)) &&
          !entry.entity_type.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (actionFilter !== "all" && entry.action !== actionFilter) {
        return false;
      }
      return true;
    });
  }, [entries, searchQuery, actionFilter]);

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
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all actions and changes in your agency
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { value: "all", label: "All Actions" },
                { value: "verification_approved", label: "Verifications Approved" },
                { value: "verification_rejected", label: "Verifications Rejected" },
                { value: "employee_added", label: "Employees Added" },
                { value: "employee_deactivated", label: "Employees Deactivated" },
                { value: "skill_updated", label: "Skills Updated" },
                { value: "cycle_created", label: "Cycles Created" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} entries
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((entry) => (
              <AuditLogRow key={entry.id} entry={entry} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No log entries found</p>
              {searchQuery && (
                <p className="text-sm">Try adjusting your search</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

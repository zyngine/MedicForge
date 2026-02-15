"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  Spinner,
  Select,
} from "@/components/ui";
import {
  FileText,
  Search,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  UserPlus,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";

// Placeholder data
const MOCK_AUDIT_LOG = [
  {
    id: "1",
    action: "verification_approved",
    actor: "Dr. Sarah Johnson",
    actorRole: "Medical Director",
    target: "John Smith - BLS/CPR",
    timestamp: "2025-02-15T10:30:00Z",
    details: "Approved annual BLS recertification",
  },
  {
    id: "2",
    action: "employee_added",
    actor: "Admin User",
    actorRole: "Agency Admin",
    target: "Mike Johnson",
    timestamp: "2025-02-14T14:15:00Z",
    details: "New employee record created",
  },
  {
    id: "3",
    action: "verification_rejected",
    actor: "Dr. Sarah Johnson",
    actorRole: "Medical Director",
    target: "Jane Doe - IV Therapy",
    timestamp: "2025-02-13T09:00:00Z",
    details: "Rejected: Needs additional practice hours",
  },
  {
    id: "4",
    action: "cycle_created",
    actor: "Admin User",
    actorRole: "Agency Admin",
    target: "Annual 2025",
    timestamp: "2025-01-02T08:00:00Z",
    details: "Created new verification cycle",
  },
  {
    id: "5",
    action: "skill_updated",
    actor: "Admin User",
    actorRole: "Agency Admin",
    target: "12-Lead ECG Interpretation",
    timestamp: "2025-01-15T11:30:00Z",
    details: "Updated renewal period from 12 to 24 months",
  },
  {
    id: "6",
    action: "employee_deactivated",
    actor: "Admin User",
    actorRole: "Agency Admin",
    target: "Former Employee",
    timestamp: "2025-01-10T16:45:00Z",
    details: "Employment ended",
  },
];

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

function AuditLogRow({ entry }: { entry: typeof MOCK_AUDIT_LOG[0] }) {
  const Icon = ACTION_ICONS[entry.action] || FileText;
  const colorClass = ACTION_COLORS[entry.action] || "text-muted-foreground bg-muted";

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{ACTION_LABELS[entry.action]}</p>
          <Badge variant="secondary" className="text-xs">
            {entry.actorRole}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {entry.target}
        </p>
        {entry.details && (
          <p className="text-sm text-muted-foreground mt-1 italic">
            {entry.details}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>{entry.actor}</span>
          <span>{new Date(entry.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [isLoading] = React.useState(false);

  const filteredLogs = React.useMemo(() => {
    return MOCK_AUDIT_LOG.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.target.toLowerCase().includes(query) &&
          !entry.actor.toLowerCase().includes(query) &&
          !(entry.details?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Action filter
      if (actionFilter !== "all" && entry.action !== actionFilter) {
        return false;
      }

      return true;
    });
  }, [searchQuery, actionFilter]);

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
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
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

      {/* Pagination placeholder */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page 1 of 1</span>
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      </div>
    </div>
  );
}

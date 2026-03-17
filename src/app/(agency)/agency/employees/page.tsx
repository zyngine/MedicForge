"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Spinner,
  Select,
} from "@/components/ui";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencyEmployees } from "@/lib/hooks/use-agency-data";

import type { AgencyEmployee } from "@/lib/hooks/use-agency-data";

function EmployeeRow({ employee }: { employee: AgencyEmployee }) {
  const total = employee.competencies?.length ?? 0;
  const completed = employee.competencies?.filter((c) => c.status === "verified").length ?? 0;
  const expiring = employee.competencies?.filter((c) => c.status === "expired").length ?? 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{employee.first_name} {employee.last_name}</p>
          {!employee.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{employee.email ?? employee.employee_number ?? "—"}</p>
      </div>

      <div className="hidden sm:block w-24 text-center">
        <Badge variant="outline">{employee.certification_level}</Badge>
      </div>

      <div className="hidden md:flex items-center gap-2 w-32">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10">{completionPct}%</span>
      </div>

      <div className="hidden lg:flex items-center gap-1 w-20">
        {expiring > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {expiring}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-success gap-1">
            <CheckCircle className="h-3 w-3" />
            OK
          </Badge>
        )}
      </div>

      <Button variant="ghost" size="sm" asChild>
        <Link href={`/agency/employees/${employee.id}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default function EmployeesPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const { isAgencyAdmin } = useAgencyRole();
  const { employees, isLoading } = useAgencyEmployees();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [certFilter, setCertFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState(filterParam || "all");

  // Filter employees based on search and filters
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        if (!name.includes(query) && !(emp.email ?? "").toLowerCase().includes(query)) {
          return false;
        }
      }
      if (certFilter !== "all" && emp.certification_level !== certFilter) return false;
      if (statusFilter === "active" && !emp.is_active) return false;
      if (statusFilter === "inactive" && emp.is_active) return false;
      if (statusFilter === "expiring") {
        const expiring = emp.competencies?.filter((c) => c.status === "expired").length ?? 0;
        if (expiring === 0) return false;
      }
      return true;
    });
  }, [searchQuery, certFilter, statusFilter]);

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
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            Manage employee records and competency tracking
          </p>
        </div>
        {isAgencyAdmin && (
          <Button asChild>
            <Link href="/agency/employees/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={certFilter}
                onChange={setCertFilter}
                options={[
                  { value: "all", label: "All Levels" },
                  { value: "EMR", label: "EMR" },
                  { value: "EMT", label: "EMT" },
                  { value: "AEMT", label: "AEMT" },
                  { value: "Paramedic", label: "Paramedic" },
                ]}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "expiring", label: "Expiring Soon" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Directory
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredEmployees.length} employees
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {/* Table header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="flex-1">Employee</div>
            <div className="w-24 text-center">Cert Level</div>
            <div className="hidden md:block w-32">Completion</div>
            <div className="hidden lg:block w-20">Status</div>
            <div className="w-10" />
          </div>

          {/* Employee rows */}
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
              {searchQuery && (
                <p className="text-sm">Try adjusting your search or filters</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

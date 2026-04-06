"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Spinner,
  Alert,
  Select,
} from "@/components/ui";
import {
  useAgencyEmployees,
  useDeactivateEmployee,
  useReactivateEmployee,
  AgencyEmployee,
} from "@/lib/hooks/use-agency-employees";
import {
  Search,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  AlertTriangle,
  UserCheck,
  UserX,
  Edit,
  Download,
  Upload,
} from "lucide-react";

const CERTIFICATION_LEVELS = ["All", "EMR", "EMT", "AEMT", "Paramedic", "Other"];

export default function EmployeesPage() {
  const [search, setSearch] = React.useState("");
  const [certFilter, setCertFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("active");
  const [_selectedEmployee, _setSelectedEmployee] = React.useState<AgencyEmployee | null>(null);
  const [showActions, setShowActions] = React.useState<string | null>(null);

  const { data: employees, isLoading, error } = useAgencyEmployees({
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    certificationLevel: certFilter === "All" ? undefined : certFilter,
  });

  const deactivate = useDeactivateEmployee();
  const reactivate = useReactivateEmployee();

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const searchLower = search.toLowerCase();
      return (
        emp.first_name.toLowerCase().includes(searchLower) ||
        emp.last_name.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.employee_number?.toLowerCase().includes(searchLower)
      );
    });
  }, [employees, search]);

  const handleDeactivate = async (employeeId: string) => {
    if (confirm("Are you sure you want to deactivate this employee?")) {
      await deactivate.mutateAsync(employeeId);
    }
    setShowActions(null);
  };

  const handleReactivate = async (employeeId: string) => {
    await reactivate.mutateAsync(employeeId);
    setShowActions(null);
  };

  const getExpirationStatus = (expDate: string | null) => {
    if (!expDate) return null;
    const exp = new Date(expDate);
    const now = new Date();
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { status: "expired", days: Math.abs(daysUntil), color: "destructive" };
    if (daysUntil <= 30) return { status: "expiring", days: daysUntil, color: "warning" };
    if (daysUntil <= 90) return { status: "upcoming", days: daysUntil, color: "secondary" };
    return null;
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            Manage your agency workforce and their certifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/agency/employees/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          Failed to load employees. Please try again.
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={certFilter}
              options={CERTIFICATION_LEVELS.map((level) => ({
                value: level,
                label: level === "All" ? "All Levels" : level,
              }))}
              onChange={(value) => setCertFilter(value)}
              className="w-full sm:w-40"
            />
            <Select
              value={statusFilter}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "all", label: "All" },
              ]}
              onChange={(value) => setStatusFilter(value as "active" | "inactive" | "all")}
              className="w-full sm:w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredEmployees.length} of {employees?.length || 0} employees
        </span>
      </div>

      {/* Employee List */}
      <div className="grid gap-4">
        {filteredEmployees.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || certFilter !== "All" || statusFilter !== "active"
                  ? "Try adjusting your filters"
                  : "Add your first employee to get started"}
              </p>
              {!search && certFilter === "All" && statusFilter === "active" && (
                <Link href="/admin/agency/employees/new">
                  <Button>Add Employee</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => {
            const expStatus = getExpirationStatus(employee.certification_expiration);

            return (
              <Card key={employee.id} className={!employee.is_active ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Avatar Placeholder */}
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </h3>
                          {!employee.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {employee.employee_number && (
                          <p className="text-sm text-muted-foreground">
                            #{employee.employee_number}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{employee.certification_level}</Badge>

                          {employee.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </span>
                          )}

                          {employee.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {employee.phone}
                            </span>
                          )}

                          {employee.department && (
                            <span>{employee.department}</span>
                          )}
                        </div>

                        {/* Certification Expiration Warning */}
                        {expStatus && (
                          <div className="mt-2">
                            <Badge
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              variant={expStatus.color as any}
                              className="flex items-center gap-1 w-fit"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {expStatus.status === "expired"
                                ? `Expired ${expStatus.days} days ago`
                                : `Expires in ${expStatus.days} days`}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(showActions === employee.id ? null : employee.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {showActions === employee.id && (
                        <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-background border z-10">
                          <div className="py-1">
                            <Link
                              href={`/admin/agency/employees/${employee.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                              onClick={() => setShowActions(null)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit Details
                            </Link>
                            <Link
                              href={`/admin/agency/employees/${employee.id}/competencies`}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                              onClick={() => setShowActions(null)}
                            >
                              <UserCheck className="h-4 w-4" />
                              View Competencies
                            </Link>
                            <div className="border-t my-1" />
                            {employee.is_active ? (
                              <button
                                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-amber-600"
                                onClick={() => handleDeactivate(employee.id)}
                              >
                                <UserX className="h-4 w-4" />
                                Deactivate
                              </button>
                            ) : (
                              <button
                                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-green-600"
                                onClick={() => handleReactivate(employee.id)}
                              >
                                <UserCheck className="h-4 w-4" />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

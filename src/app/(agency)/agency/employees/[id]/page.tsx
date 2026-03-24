"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Label,
  Modal,
  Progress,
} from "@/components/ui";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Award,
  Building2,
  Briefcase,
  Calendar,
  Hash,
  Pencil,
  UserCheck,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import {
  useEmployeeCompetencies,
  type EmployeeCompetency,
} from "@/lib/hooks/use-employee-competencies";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmployeeDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  employee_number: string | null;
  certification_level: string;
  certification_expiry: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  supervisor_name: string | null;
  is_active: boolean;
}

interface Cycle {
  id: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CERT_LEVELS = [
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "verified", label: "Verified" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

type CompetencyStatus = "pending" | "completed" | "verified" | "expired" | "rejected";

const STATUS_BADGE_VARIANTS: Record<CompetencyStatus, string> = {
  pending: "secondary",
  completed: "outline",
  verified: "success",
  expired: "destructive",
  rejected: "destructive",
};

const STATUS_LABELS: Record<CompetencyStatus, string> = {
  pending: "Not Started",
  completed: "In Progress",
  verified: "Verified",
  expired: "Expired",
  rejected: "Failed",
};

// ─── Helper: format date ──────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Competency status badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: CompetencyStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status] as any}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ─── Edit Employee Modal ──────────────────────────────────────────────────────

interface EditModalProps {
  employee: EmployeeDetail;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: EmployeeDetail) => void;
}

function EditEmployeeModal({ employee, isOpen, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = React.useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    employee_number: employee.employee_number ?? "",
    certification_level: employee.certification_level,
    certification_expiry: employee.certification_expiry ?? "",
    department: employee.department ?? "",
    position: employee.position ?? "",
    hire_date: employee.hire_date ?? "",
    supervisor_name: employee.supervisor_name ?? "",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset when modal opens with fresh employee data
  React.useEffect(() => {
    if (isOpen) {
      setForm({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        employee_number: employee.employee_number ?? "",
        certification_level: employee.certification_level,
        certification_expiry: employee.certification_expiry ?? "",
        department: employee.department ?? "",
        position: employee.position ?? "",
        hire_date: employee.hire_date ?? "",
        supervisor_name: employee.supervisor_name ?? "",
      });
    }
  }, [isOpen, employee]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agency/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update employee");
      }
      const { employee: updated } = await res.json();
      toast.success("Employee updated successfully");
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">First Name</Label>
            <Input
              id="edit-first-name"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-last-name">Last Name</Label>
            <Input
              id="edit-last-name"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-emp-num">Employee Number</Label>
            <Input
              id="edit-emp-num"
              value={form.employee_number}
              onChange={(e) => update("employee_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cert-level">Certification Level</Label>
            <Select
              id="edit-cert-level"
              value={form.certification_level}
              onChange={(value) => update("certification_level", value)}
              options={CERT_LEVELS}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-cert-expiry">Cert Expiration</Label>
            <Input
              id="edit-cert-expiry"
              type="date"
              value={form.certification_expiry}
              onChange={(e) => update("certification_expiry", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hire-date">Hire Date</Label>
            <Input
              id="edit-hire-date"
              type="date"
              value={form.hire_date}
              onChange={(e) => update("hire_date", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Input
              id="edit-department"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-position">Position</Label>
            <Input
              id="edit-position"
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-supervisor">Supervisor Name</Label>
          <Input
            id="edit-supervisor"
            value={form.supervisor_name}
            onChange={(e) => update("supervisor_name", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Competency Grid ──────────────────────────────────────────────────────────

interface CompetencyGridProps {
  employeeId: string;
  cycleId: string;
  isAdmin: boolean;
}

function CompetencyGrid({ employeeId, cycleId, isAdmin }: CompetencyGridProps) {
  const queryClient = useQueryClient();
  const { data: competencies = [], isLoading } = useEmployeeCompetencies(employeeId, {
    cycleId: cycleId || undefined,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      competencyId,
      status,
    }: {
      competencyId: string;
      status: string;
    }) => {
      const res = await fetch(`/api/agency/employees/${employeeId}/competencies/${competencyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", employeeId] });
      toast.success("Status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (competencies.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p>No competencies found for this cycle.</p>
      </div>
    );
  }

  // Group by skill category
  const grouped = competencies.reduce<Record<string, EmployeeCompetency[]>>((acc, comp) => {
    const category = comp.skill?.category ?? "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(comp);
    return acc;
  }, {});

  const total = competencies.length;
  const verified = competencies.filter((c) => c.status === "verified").length;
  const completionPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  const progressVariant =
    completionPct >= 80 ? "success" : completionPct >= 40 ? "default" : "warning";

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall completion</span>
          <span className="font-medium">
            {verified} / {total} verified ({completionPct}%)
          </span>
        </div>
        <Progress value={completionPct} variant={progressVariant} size="md" />
      </div>

      {/* Skill groups */}
      {Object.entries(grouped).map(([category, skills]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="divide-y rounded-md border">
            {skills.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {comp.skill?.name ?? "Unknown Skill"}
                  </p>
                  {comp.skill?.skill_code && (
                    <p className="text-xs text-muted-foreground">{comp.skill.skill_code}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isAdmin ? (
                    <Select
                      value={comp.status}
                      onChange={(value) =>
                        updateStatus.mutate({ competencyId: comp.id, status: value })
                      }
                      options={STATUS_OPTIONS}
                    />
                  ) : (
                    <StatusBadge status={comp.status as CompetencyStatus} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { isAgencyAdmin } = useAgencyRole();
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedCycleId, setSelectedCycleId] = React.useState("");

  // Fetch employee detail
  const {
    data: employeeData,
    isLoading: employeeLoading,
    error: employeeError,
    refetch,
  } = useQuery({
    queryKey: ["agency-employee", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/agency/employees/${employeeId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to load employee");
      }
      return res.json() as Promise<{ employee: EmployeeDetail; competencies: EmployeeCompetency[] }>;
    },
    enabled: !!employeeId,
  });

  // Fetch cycles for dropdown
  const { data: cyclesData } = useQuery({
    queryKey: ["agency-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/agency/cycles");
      if (!res.ok) return { cycles: [] as Cycle[] };
      return res.json() as Promise<{ cycles: Cycle[] }>;
    },
  });

  const employee = employeeData?.employee;
  const cycles = cyclesData?.cycles ?? [];
  const cycleOptions = [
    { value: "", label: "All Cycles" },
    ...cycles.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleSaved = (updated: EmployeeDetail) => {
    refetch();
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (employeeError || !employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agency/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm">
          {employeeError instanceof Error
            ? employeeError.message
            : "Employee not found."}
        </div>
      </div>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agency/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <Badge variant={employee.is_active ? "success" : "secondary"}>
                {employee.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Employee detail</p>
          </div>
        </div>
        {isAgencyAdmin && (
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Employee Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Employee Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={Hash} label="Employee Number" value={employee.employee_number} />
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Phone" value={employee.phone} />
            <InfoRow
              icon={Award}
              label="Certification Level"
              value={
                <Badge variant="outline" className="mt-0.5">
                  {employee.certification_level}
                </Badge>
              }
            />
            <InfoRow
              icon={Calendar}
              label="Cert Expiration"
              value={formatDate(employee.certification_expiry)}
            />
            <InfoRow icon={Calendar} label="Hire Date" value={formatDate(employee.hire_date)} />
            <InfoRow icon={Building2} label="Department" value={employee.department} />
            <InfoRow icon={Briefcase} label="Position" value={employee.position} />
            <InfoRow icon={UserCheck} label="Supervisor" value={employee.supervisor_name} />
          </div>
        </CardContent>
      </Card>

      {/* Competency Grid */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Competency Grid
            </CardTitle>
            <div className="w-48">
              <Select
                value={selectedCycleId}
                onChange={setSelectedCycleId}
                options={cycleOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CompetencyGrid
            employeeId={employeeId}
            cycleId={selectedCycleId}
            isAdmin={isAgencyAdmin}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {isAgencyAdmin && (
        <EditEmployeeModal
          employee={employee}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Alert,
} from "@/components/ui";
import { useCreateAgencyEmployee, CreateEmployeeInput } from "@/lib/hooks/use-agency-employees";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const CERTIFICATION_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic", "Other"];

export default function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateAgencyEmployee();

  const [formData, setFormData] = React.useState<CreateEmployeeInput>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    employee_number: "",
    certification_level: "EMT",
    state_certification_number: "",
    national_registry_number: "",
    certification_expiration: "",
    hire_date: "",
    department: "",
    position: "",
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (field: keyof CreateEmployeeInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.first_name || !formData.last_name) {
      setError("First name and last name are required");
      return;
    }

    try {
      await createEmployee.mutateAsync({
        ...formData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        certification_level: formData.certification_level as any,
      });
      router.push("/admin/agency/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/agency/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Employee</h1>
          <p className="text-muted-foreground">
            Add an employee to your agency roster
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Employee Number</label>
              <Input
                value={formData.employee_number}
                onChange={(e) => handleChange("employee_number", e.target.value)}
                placeholder="EMP001"
              />
            </div>
          </CardContent>
        </Card>

        {/* Certification Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Certification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Certification Level *</label>
              <Select
                value={formData.certification_level}
                options={CERTIFICATION_LEVELS.map((level) => ({ value: level, label: level }))}
                onChange={(value) => handleChange("certification_level", value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">State Certification #</label>
                <Input
                  value={formData.state_certification_number}
                  onChange={(e) => handleChange("state_certification_number", e.target.value)}
                  placeholder="PA-12345"
                />
              </div>
              <div>
                <label className="text-sm font-medium">National Registry #</label>
                <Input
                  value={formData.national_registry_number}
                  onChange={(e) => handleChange("national_registry_number", e.target.value)}
                  placeholder="E1234567"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Certification Expiration</label>
              <Input
                type="date"
                value={formData.certification_expiration}
                onChange={(e) => handleChange("certification_expiration", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Hire Date</label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleChange("hire_date", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  placeholder="Operations"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  placeholder="Paramedic"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/agency/employees">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createEmployee.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createEmployee.isPending ? "Saving..." : "Add Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}

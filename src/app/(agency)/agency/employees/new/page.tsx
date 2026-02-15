"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  Alert,
  Spinner,
} from "@/components/ui";
import { ArrowLeft, User, Mail, Phone, Award } from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

const CERT_LEVELS = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const { isAgencyAdmin } = useAgencyRole();

  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    certLevel: "EMT",
    certNumber: "",
    certExpiry: "",
    employeeId: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect non-admins
  React.useEffect(() => {
    if (!isAgencyAdmin) {
      router.replace("/agency/employees");
    }
  }, [isAgencyAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Implement API call
      // const response = await fetch("/api/agency/employees", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(formData),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/agency/employees");
    } catch (err) {
      setError("Failed to create employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agency/employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-muted-foreground">
            Create a new employee record
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Basic employee details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" required>
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" required>
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Smith"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john.smith@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => updateField("employeeId", e.target.value)}
                  placeholder="EMP-001"
                />
                <p className="text-xs text-muted-foreground">
                  Optional internal employee identifier
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Certification Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certification
              </CardTitle>
              <CardDescription>
                EMS certification details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certLevel" required>
                  Certification Level
                </Label>
                <Select
                  id="certLevel"
                  value={formData.certLevel}
                  onChange={(value) => updateField("certLevel", value)}
                  options={CERT_LEVELS}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certNumber">
                  Certification Number
                </Label>
                <Input
                  id="certNumber"
                  value={formData.certNumber}
                  onChange={(e) => updateField("certNumber", e.target.value)}
                  placeholder="PA-EMT-123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certExpiry">
                  Certification Expiry
                </Label>
                <Input
                  id="certExpiry"
                  type="date"
                  value={formData.certExpiry}
                  onChange={(e) => updateField("certExpiry", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/agency/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              "Create Employee"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

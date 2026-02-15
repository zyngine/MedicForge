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
  Alert,
  Spinner,
  Checkbox,
} from "@/components/ui";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

export default function NewCyclePage() {
  const router = useRouter();
  const { isAgencyAdmin } = useAgencyRole();

  const [formData, setFormData] = React.useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    includeAllEmployees: true,
    includeAllSkills: true,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect non-admins
  React.useEffect(() => {
    if (!isAgencyAdmin) {
      router.replace("/agency/cycles");
    }
  }, [isAgencyAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError("End date must be after start date");
      setIsSubmitting(false);
      return;
    }

    try {
      // TODO: Implement API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/agency/cycles");
    } catch (err) {
      setError("Failed to create cycle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agency/cycles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Verification Cycle</h1>
          <p className="text-muted-foreground">
            Set up a new competency verification period
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cycle Details
            </CardTitle>
            <CardDescription>
              Define the verification cycle period and scope
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Cycle Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Annual 2025, Q1 Skills Review"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" required>
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" required>
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Optional notes about this cycle"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Scope</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeAllEmployees"
                    checked={formData.includeAllEmployees}
                    onChange={(checked) => updateField("includeAllEmployees", checked)}
                  />
                  <Label htmlFor="includeAllEmployees" className="cursor-pointer">
                    Include all active employees
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeAllSkills"
                    checked={formData.includeAllSkills}
                    onChange={(checked) => updateField("includeAllSkills", checked)}
                  />
                  <Label htmlFor="includeAllSkills" className="cursor-pointer">
                    Include all skills requiring verification
                  </Label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You can customize employee and skill selection after creating the cycle.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/agency/cycles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              "Create Cycle"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Spinner, Alert } from "@/components/ui";
import { ShiftForm } from "@/components/clinical";
import { ArrowLeft } from "lucide-react";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import { useClinicalShifts } from "@/lib/hooks/use-clinical-shifts";
import { useCourses } from "@/lib/hooks/use-courses";
import type { ClinicalShiftForm } from "@/types";

export default function NewShiftPage() {
  const router = useRouter();
  const { sites, isLoading: sitesLoading, error: sitesError } = useClinicalSites();
  const { createShift } = useClinicalShifts();
  const { data: courses = [] } = useCourses();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ClinicalShiftForm) => {
    setIsSubmitting(true);
    try {
      const result = await createShift(data);
      if (result) {
        router.push("/instructor/clinical/shifts");
      }
    } catch (error) {
      console.error("Failed to create shift:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (sitesError) {
    return (
      <Alert variant="error" title="Error loading sites">
        {sitesError.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/instructor/clinical/shifts"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shifts
        </Link>
        <h1 className="text-2xl font-bold">Create Clinical Shift</h1>
        <p className="text-muted-foreground">
          Schedule a new clinical rotation shift for students
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Details</CardTitle>
          <CardDescription>
            Fill in the shift information. Students will be able to book this shift once created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftForm
            sites={sites}
            courses={courses}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/instructor/clinical/shifts")}
            isLoading={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}

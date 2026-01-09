"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { ShiftForm } from "@/components/clinical";
import { ArrowLeft } from "lucide-react";
import type { ClinicalShiftForm, ClinicalSite } from "@/types";

// Mock sites data
const mockSites: ClinicalSite[] = [
  {
    id: "1",
    tenant_id: "t1",
    name: "Memorial Hospital",
    site_type: "hospital",
    address: "123 Medical Center Dr",
    city: "Springfield",
    state: "IL",
    zip: "62701",
    phone: "(555) 123-4567",
    contact_name: "Dr. Sarah Johnson",
    contact_email: "sjohnson@memorial.org",
    preceptors: [],
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    tenant_id: "t1",
    name: "County Fire & Rescue",
    site_type: "fire_department",
    address: "456 Station Road",
    city: "Springfield",
    state: "IL",
    zip: "62702",
    phone: "(555) 987-6543",
    contact_name: "Chief Williams",
    contact_email: "chief@countyfire.gov",
    preceptors: [],
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    tenant_id: "t1",
    name: "Metro Ambulance",
    site_type: "ambulance_service",
    address: "789 Commerce Blvd",
    city: "Springfield",
    state: "IL",
    zip: "62703",
    phone: "(555) 456-7890",
    contact_name: "Operations Manager",
    contact_email: "ops@metroambulance.com",
    preceptors: [],
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function NewShiftPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ClinicalShiftForm) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log("Creating shift:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/instructor/clinical/shifts");
    } catch (error) {
      console.error("Failed to create shift:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            sites={mockSites}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/instructor/clinical/shifts")}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}

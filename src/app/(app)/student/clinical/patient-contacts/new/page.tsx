"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";
import { PatientContactFormWizard } from "@/components/clinical";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import type { ShiftBookingWithDetails, ClinicalSite } from "@/types";
import { format, addDays } from "date-fns";

// Mock completed shifts
const mockSite: ClinicalSite = {
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
};

const mockCompletedBookings: ShiftBookingWithDetails[] = [
  {
    id: "b1",
    tenant_id: "t1",
    shift_id: "s1",
    student_id: "student1",
    status: "completed",
    booked_at: format(addDays(new Date(), -5), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    cancelled_at: null,
    cancellation_reason: null,
    check_in_time: format(addDays(new Date(), -3), "yyyy-MM-dd") + "T07:00:00Z",
    check_out_time: format(addDays(new Date(), -3), "yyyy-MM-dd") + "T19:00:00Z",
    hours_completed: 12,
    preceptor_name: "Mike Thompson",
    preceptor_signature: "signature",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: {
      id: "s1",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Day Shift - 12 Hours",
      shift_date: format(addDays(new Date(), -3), "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "19:00",
      capacity: 2,
      notes: null,
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSite,
    },
  },
  {
    id: "b2",
    tenant_id: "t1",
    shift_id: "s2",
    student_id: "student1",
    status: "completed",
    booked_at: format(addDays(new Date(), -10), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    cancelled_at: null,
    cancellation_reason: null,
    check_in_time: format(addDays(new Date(), -7), "yyyy-MM-dd") + "T19:00:00Z",
    check_out_time: format(addDays(new Date(), -6), "yyyy-MM-dd") + "T07:00:00Z",
    hours_completed: 12,
    preceptor_name: "Captain Rodriguez",
    preceptor_signature: "signature",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: {
      id: "s2",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Night Shift - 12 Hours",
      shift_date: format(addDays(new Date(), -7), "yyyy-MM-dd"),
      start_time: "19:00",
      end_time: "07:00",
      capacity: 1,
      notes: null,
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSite,
    },
  },
];

export default function NewPatientContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("booking");

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    bookingIdParam
  );

  const selectedBooking = mockCompletedBookings.find(
    (b) => b.id === selectedBookingId
  );

  const handleSubmit = async (data: any) => {
    // TODO: Replace with actual API call
    console.log("Submitting patient contact:", {
      ...data,
      booking_id: selectedBookingId,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/student/clinical/patient-contacts");
  };

  // Step 1: Select a shift
  if (!selectedBookingId) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/student/clinical/patient-contacts"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient Contacts
          </Link>
          <h1 className="text-2xl font-bold">Document Patient Contact</h1>
          <p className="text-muted-foreground">
            First, select the clinical shift where this patient contact occurred
          </p>
        </div>

        {mockCompletedBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Completed Shifts</h3>
              <p className="text-muted-foreground mb-4">
                You need to complete a clinical shift before you can document patient
                contacts.
              </p>
              <Button asChild>
                <Link href="/student/clinical/schedule">Book a Shift</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the shift from your completed clinical rotations:
            </p>
            {mockCompletedBookings.map((booking) => (
              <Card
                key={booking.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedBookingId(booking.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.shift?.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(booking.shift?.shift_date || ""),
                              "MMM d, yyyy"
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.shift?.start_time} - {booking.shift?.end_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {booking.shift?.site?.name}
                          </span>
                        </div>
                        {booking.preceptor_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Preceptor: {booking.preceptor_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline">Select</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Fill out the patient contact form
  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setSelectedBookingId(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Change Shift
        </button>
        <h1 className="text-2xl font-bold">Document Patient Contact</h1>
        <p className="text-muted-foreground">
          Document a patient encounter from your clinical shift
        </p>
      </div>

      {/* Selected Shift Info */}
      {selectedBooking && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-medium">{selectedBooking.shift?.title}</p>
                <p className="text-muted-foreground">
                  {format(
                    new Date(selectedBooking.shift?.shift_date || ""),
                    "MMMM d, yyyy"
                  )}{" "}
                  at {selectedBooking.shift?.site?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Contact Form */}
      <PatientContactFormWizard
        bookingId={selectedBookingId}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/student/clinical/patient-contacts")}
      />
    </div>
  );
}

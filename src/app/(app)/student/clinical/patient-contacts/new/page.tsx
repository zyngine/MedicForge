"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";
import { PatientContactFormWizard } from "@/components/clinical";
import { ArrowLeft, Calendar, Clock, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useMyBookings } from "@/lib/hooks/use-shift-bookings";
import { usePatientContacts } from "@/lib/hooks/use-patient-contacts";
import { format } from "date-fns";

export default function NewPatientContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("booking");

  const { bookings, isLoading: bookingsLoading, error: bookingsError } = useMyBookings();
  const { createContact } = usePatientContacts();

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    bookingIdParam
  );

  // Filter to only show completed bookings
  const completedBookings = bookings.filter((b) => b.status === "completed");

  const selectedBooking = completedBookings.find(
    (b) => b.id === selectedBookingId
  );

  const handleSubmit = async (data: any) => {
    const result = await createContact({
      ...data,
      booking_id: selectedBookingId!,
    });
    if (result) {
      router.push("/student/clinical/patient-contacts");
    }
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bookingsError) {
    return (
      <div className="space-y-6">
        <Link
          href="/student/clinical/patient-contacts"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient Contacts
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Bookings</h3>
            <p className="text-muted-foreground">{bookingsError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        {completedBookings.length === 0 ? (
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
            {completedBookings.map((booking) => (
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

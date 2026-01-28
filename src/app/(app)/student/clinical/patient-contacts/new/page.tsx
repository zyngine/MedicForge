"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Select } from "@/components/ui";
import { PatientContactFormWizard } from "@/components/clinical";
import { ArrowLeft, Calendar, Clock, MapPin, Loader2, AlertCircle, FileText, ClipboardList } from "lucide-react";
import { useMyBookings } from "@/lib/hooks/use-shift-bookings";
import { usePatientContacts } from "@/lib/hooks/use-patient-contacts";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { format } from "date-fns";

const siteTypeOptions = [
  { value: "hospital_er", label: "Hospital Emergency Room" },
  { value: "ambulance", label: "Ambulance Service" },
  { value: "fire_station", label: "Fire Station" },
  { value: "clinic", label: "Urgent Care Clinic" },
  { value: "other", label: "Other" },
];

function NewPatientContactContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("booking");

  const { bookings, isLoading: bookingsLoading, error: bookingsError } = useMyBookings();
  const { createContact } = usePatientContacts();
  const { data: enrollments = [] } = useMyEnrollments();

  // Mode: "select" (choose method), "shift" (from shift), "manual" (independent entry)
  const [mode, setMode] = useState<"select" | "shift" | "manual">(
    bookingIdParam ? "shift" : "select"
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    bookingIdParam
  );

  // Manual entry fields
  const [manualData, setManualData] = useState({
    contact_date: "",
    site_name: "",
    site_type: "",
    supervisor_name: "",
    supervisor_credentials: "",
    course_id: "",
  });
  const [manualInfoComplete, setManualInfoComplete] = useState(false);

  // Filter to only show completed bookings
  const completedBookings = bookings.filter((b) => b.status === "completed");

  const selectedBooking = completedBookings.find(
    (b) => b.id === selectedBookingId
  );

  const handleSubmit = async (data: any) => {
    if (mode === "shift" && selectedBookingId) {
      const result = await createContact({
        ...data,
        booking_id: selectedBookingId,
      });
      if (result) {
        router.push("/student/clinical/patient-contacts");
      }
    } else if (mode === "manual") {
      const result = await createContact({
        ...data,
        booking_id: null,
        contact_date: manualData.contact_date,
        site_name: manualData.site_name,
        site_type: manualData.site_type,
        supervisor_name: manualData.supervisor_name,
        supervisor_credentials: manualData.supervisor_credentials,
        course_id: manualData.course_id || undefined,
      });
      if (result) {
        router.push("/student/clinical/patient-contacts");
      }
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
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground">{bookingsError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Choose how to log the contact
  if (mode === "select") {
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
            Choose how you want to log this patient encounter
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Option 1: From a completed shift */}
          <Card
            className={`cursor-pointer hover:border-primary transition-colors ${
              completedBookings.length === 0 ? "opacity-50" : ""
            }`}
            onClick={() => completedBookings.length > 0 && setMode("shift")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">From a Clinical Shift</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Link this contact to one of your completed clinical shifts.
                    Site and preceptor info will be auto-filled.
                  </p>
                  {completedBookings.length === 0 ? (
                    <p className="text-xs text-warning">
                      No completed shifts available
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {completedBookings.length} completed shift(s) available
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Independent entry */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setMode("manual")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-info/10 text-info">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Independent Entry</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Log a patient contact without linking to a scheduled shift.
                    You&apos;ll enter site and date information manually.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Good for ride-alongs, observation, or external clinicals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Mode: Shift selection
  if (mode === "shift" && !selectedBookingId) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setMode("select")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Options
          </button>
          <h1 className="text-2xl font-bold">Select Clinical Shift</h1>
          <p className="text-muted-foreground">
            Choose the shift where this patient contact occurred
          </p>
        </div>

        <div className="space-y-4">
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
      </div>
    );
  }

  // Mode: Manual entry - show manual fields first
  if (mode === "manual" && !manualInfoComplete) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setMode("select")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Options
          </button>
          <h1 className="text-2xl font-bold">Clinical Information</h1>
          <p className="text-muted-foreground">
            Enter the details about where this patient contact occurred
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_date" required>Date of Contact</Label>
                <Input
                  id="contact_date"
                  type="date"
                  value={manualData.contact_date}
                  onChange={(e) =>
                    setManualData({ ...manualData, contact_date: e.target.value })
                  }
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              {enrollments.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="course">Course (Optional)</Label>
                  <Select
                    options={enrollments.map((e) => ({
                      value: e.course?.id || "",
                      label: e.course?.title || "Unknown Course",
                    }))}
                    value={manualData.course_id}
                    onChange={(value) =>
                      setManualData({ ...manualData, course_id: value })
                    }
                    placeholder="Select course"
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_type">Site Type</Label>
                <Select
                  options={siteTypeOptions}
                  value={manualData.site_type}
                  onChange={(value) =>
                    setManualData({ ...manualData, site_type: value })
                  }
                  placeholder="Select site type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_name" required>Site Name</Label>
                <Input
                  id="site_name"
                  placeholder="e.g., City Hospital ER"
                  value={manualData.site_name}
                  onChange={(e) =>
                    setManualData({ ...manualData, site_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supervisor_name">Supervisor/Preceptor Name</Label>
                <Input
                  id="supervisor_name"
                  placeholder="e.g., John Smith"
                  value={manualData.supervisor_name}
                  onChange={(e) =>
                    setManualData({ ...manualData, supervisor_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisor_credentials">Credentials</Label>
                <Input
                  id="supervisor_credentials"
                  placeholder="e.g., Paramedic, RN, MD"
                  value={manualData.supervisor_credentials}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      supervisor_credentials: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setMode("select")}>
                Cancel
              </Button>
              <Button
                disabled={!manualData.contact_date || !manualData.site_name}
                onClick={() => setManualInfoComplete(true)}
              >
                Continue to Patient Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Final step: Patient contact form (both modes)
  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => {
            if (mode === "shift") {
              setSelectedBookingId(null);
            } else {
              setManualInfoComplete(false);
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {mode === "shift" ? "Change Shift" : "Edit Clinical Info"}
        </button>
        <h1 className="text-2xl font-bold">Document Patient Contact</h1>
        <p className="text-muted-foreground">
          Document a patient encounter from your clinical experience
        </p>
      </div>

      {/* Context Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {mode === "shift" ? (
                <Calendar className="h-4 w-4" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
            </div>
            <div className="text-sm">
              {mode === "shift" && selectedBooking ? (
                <>
                  <p className="font-medium">{selectedBooking.shift?.title}</p>
                  <p className="text-muted-foreground">
                    {format(
                      new Date(selectedBooking.shift?.shift_date || ""),
                      "MMMM d, yyyy"
                    )}{" "}
                    at {selectedBooking.shift?.site?.name}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">
                    {manualData.site_name} - {format(new Date(manualData.contact_date), "MMMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground">
                    {manualData.supervisor_name && `Supervisor: ${manualData.supervisor_name}`}
                    {manualData.supervisor_credentials && ` (${manualData.supervisor_credentials})`}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Contact Form */}
      <PatientContactFormWizard
        bookingId={selectedBookingId}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/student/clinical/patient-contacts")}
      />
    </div>
  );
}

export default function NewPatientContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewPatientContactContent />
    </Suspense>
  );
}

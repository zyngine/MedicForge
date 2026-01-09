"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@/components/ui";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { ClinicalShiftWithDetails, ShiftBookingWithDetails, ClinicalSite } from "@/types";
import { format, addDays, parseISO } from "date-fns";

// Mock data
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
  preceptors: [
    { name: "Dr. Sarah Johnson", credentials: "MD, FACEP", phone: "(555) 123-4568" },
    { name: "Mike Thompson", credentials: "Paramedic", phone: "(555) 123-4569" },
  ],
  notes: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockShift: ClinicalShiftWithDetails = {
  id: "s1",
  tenant_id: "t1",
  site_id: "1",
  course_id: null,
  title: "Day Shift - 12 Hours",
  shift_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
  start_time: "07:00",
  end_time: "19:00",
  capacity: 2,
  notes: "Report to EMS station at 0645. Park in lot C.",
  created_by: "admin1",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  site: mockSite,
  bookings_count: 2,
  available_slots: 0,
  is_available: false,
};

const mockBookings: ShiftBookingWithDetails[] = [
  {
    id: "b1",
    tenant_id: "t1",
    shift_id: "s1",
    student_id: "student1",
    status: "booked",
    booked_at: new Date().toISOString(),
    cancelled_at: null,
    cancellation_reason: null,
    check_in_time: null,
    check_out_time: null,
    hours_completed: null,
    preceptor_name: null,
    preceptor_signature: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: mockShift,
    student: {
      id: "student1",
      full_name: "John Smith",
      email: "john.smith@student.edu",
    },
  },
  {
    id: "b2",
    tenant_id: "t1",
    shift_id: "s1",
    student_id: "student2",
    status: "booked",
    booked_at: new Date().toISOString(),
    cancelled_at: null,
    cancellation_reason: null,
    check_in_time: null,
    check_out_time: null,
    hours_completed: null,
    preceptor_name: null,
    preceptor_signature: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: mockShift,
    student: {
      id: "student2",
      full_name: "Jane Doe",
      email: "jane.doe@student.edu",
    },
  },
];

const STATUS_CONFIG = {
  booked: { label: "Booked", variant: "default" as const, icon: Calendar },
  completed: { label: "Completed", variant: "secondary" as const, icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
  no_show: { label: "No Show", variant: "outline" as const, icon: AlertCircle },
};

export default function ShiftDetailPage() {
  const params = useParams();
  const shiftId = params.shiftId as string;

  const [shift] = useState<ClinicalShiftWithDetails>(mockShift);
  const [bookings, setBookings] = useState<ShiftBookingWithDetails[]>(mockBookings);

  const handleMarkCompleted = (bookingId: string) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "completed" as const } : b
      )
    );
  };

  const handleMarkNoShow = (bookingId: string) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "no_show" as const } : b
      )
    );
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              cancelled_at: new Date().toISOString(),
            }
          : b
      )
    );
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{shift.title}</h1>
            <p className="text-muted-foreground">{shift.site?.name}</p>
          </div>
          <Badge
            variant={
              shift.bookings_count === shift.capacity
                ? "default"
                : shift.bookings_count && shift.bookings_count > 0
                ? "secondary"
                : "outline"
            }
            className="text-sm"
          >
            {shift.bookings_count}/{shift.capacity} booked
          </Badge>
        </div>
      </div>

      {/* Shift Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {format(parseISO(shift.shift_date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {shift.start_time} - {shift.end_time}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{shift.site?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {shift.site?.address}, {shift.site?.city}, {shift.site?.state}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {shift.bookings_count} of {shift.capacity} spots filled
                </p>
              </div>
            </div>

            {shift.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{shift.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Contact */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Site Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shift.site?.contact_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shift.site?.contact_email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shift.site?.phone}</p>
            </div>

            {shift.site?.preceptors && shift.site.preceptors.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Preceptors</p>
                <div className="space-y-2">
                  {shift.site.preceptors.map((preceptor, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 rounded bg-muted/50"
                    >
                      <p className="font-medium">{preceptor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preceptor.credentials}
                      </p>
                      {preceptor.phone && (
                        <p className="text-xs text-muted-foreground">
                          {preceptor.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/instructor/clinical/shifts/${shiftId}/edit`}>
                Edit Shift Details
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Duplicate Shift
            </Button>
            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-600">
              Cancel Shift
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Student Bookings
            <Badge variant="secondary">{bookings.length}</Badge>
          </CardTitle>
          <CardDescription>
            Students who have booked this clinical shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground">
                No students have booked this shift yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const statusConfig = STATUS_CONFIG[booking.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.student?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.student?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Booked: {format(parseISO(booking.booked_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={statusConfig.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>

                      {booking.status === "booked" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkCompleted(booking.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkNoShow(booking.id)}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            No Show
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {booking.status === "completed" && (
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/instructor/clinical/patient-contacts?booking=${booking.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Contacts
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

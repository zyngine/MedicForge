"use client";

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
  Loader2,
  Hourglass,
} from "lucide-react";
import { useClinicalShift } from "@/lib/hooks/use-clinical-shifts";
import { useShiftBookings } from "@/lib/hooks/use-shift-bookings";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  booked: { label: "Booked", variant: "default" as const, icon: Calendar },
  completed: { label: "Completed", variant: "secondary" as const, icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
  no_show: { label: "No Show", variant: "outline" as const, icon: AlertCircle },
  pending_poc_approval: { label: "Pending Approval", variant: "outline" as const, icon: Hourglass },
  poc_approved: { label: "POC Approved", variant: "secondary" as const, icon: CheckCircle },
  poc_denied: { label: "POC Denied", variant: "destructive" as const, icon: XCircle },
};

export default function ShiftDetailPage() {
  const params = useParams();
  const shiftId = params.shiftId as string;

  const { shift, isLoading: shiftLoading, error: shiftError } = useClinicalShift(shiftId);
  const {
    bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    updateBookingStatus,
    cancelBooking,
  } = useShiftBookings({ shiftId });

  const handleMarkCompleted = async (bookingId: string) => {
    await updateBookingStatus(bookingId, "completed");
  };

  const handleMarkNoShow = async (bookingId: string) => {
    await updateBookingStatus(bookingId, "no_show");
  };

  const handleCancelBooking = async (bookingId: string) => {
    await cancelBooking(bookingId, "Cancelled by instructor");
  };

  const isLoading = shiftLoading || bookingsLoading;
  const error = shiftError || bookingsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/instructor/clinical/shifts"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shifts
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Shift</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="space-y-6">
        <Link
          href="/instructor/clinical/shifts"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shifts
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Shift Not Found</h3>
            <p className="text-muted-foreground">
              The requested shift could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, Badge, Button, Modal } from "@/components/ui";
import {
  Calendar,
  Clock,
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import type { ShiftBookingWithDetails, BookingStatus } from "@/types";
import { format, parseISO } from "date-fns";

interface BookingCardProps {
  booking: ShiftBookingWithDetails;
  onCancel?: (reason?: string) => Promise<void>;
  showCancelButton?: boolean;
  showDocumentButton?: boolean;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  booked: {
    label: "Booked",
    color: "bg-blue-100 text-blue-800",
    icon: <Calendar className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: <XCircle className="h-3 w-3" />,
  },
  no_show: {
    label: "No Show",
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function BookingCard({
  booking,
  onCancel,
  showCancelButton = true,
  showDocumentButton = true,
}: BookingCardProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const shift = booking.shift;
  const statusConfig = STATUS_CONFIG[booking.status];

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsLoading(true);
    try {
      await onCancel(cancelReason || undefined);
      setShowCancelModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formattedDate = shift
    ? format(parseISO(shift.shift_date), "EEEE, MMMM d, yyyy")
    : "";

  return (
    <>
      <Card
        className={`hover:shadow-md transition-shadow ${
          booking.status === "cancelled" ? "opacity-60" : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {shift?.title || "Clinical Shift"}
              </h3>
              {shift?.site && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4" />
                  <span>{shift.site.name}</span>
                </div>
              )}
            </div>

            <Badge className={statusConfig.color}>
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </Badge>
          </div>

          {shift && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </span>
              </div>

              {shift.site?.city && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {[shift.site.city, shift.site.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {booking.hours_completed !== null && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm">
                <span className="font-medium">Hours Completed:</span>{" "}
                {booking.hours_completed}
              </p>
            </div>
          )}

          {booking.cancellation_reason && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Cancellation Reason:</span>{" "}
                {booking.cancellation_reason}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-4 border-t flex items-center gap-2">
            {showDocumentButton && booking.status === "completed" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/student/clinical/patient-contacts/new?booking=${booking.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Document Patient Contacts
                </Link>
              </Button>
            )}

            {showCancelButton && booking.status === "booked" && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                onClick={() => setShowCancelModal(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to cancel this booking? This will make the
            slot available for other students.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="cancelReason"
              className="text-sm font-medium"
            >
              Reason (optional)
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isLoading}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isLoading ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { Card, CardContent, Badge, Button } from "@/components/ui";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Building2,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { ClinicalShiftWithDetails } from "@/types";
import { format, parseISO } from "date-fns";

interface ShiftCardProps {
  shift: ClinicalShiftWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  onBook?: () => void;
  showBookButton?: boolean;
  showActions?: boolean;
  isBooked?: boolean;
}

export function ShiftCard({
  shift,
  onEdit,
  onDelete,
  onBook,
  showBookButton = false,
  showActions = true,
  isBooked = false,
}: ShiftCardProps) {
  const bookedCount = shift.bookings_count ?? 0;
  const availableSlots = shift.capacity - bookedCount;
  const isAvailable = availableSlots > 0;

  // Format date
  const formattedDate = format(parseISO(shift.shift_date), "EEEE, MMMM d, yyyy");

  // Format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${
        !isAvailable && !isBooked ? "opacity-60" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{shift.title}</h3>
            {shift.site && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span>{shift.site.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isBooked ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Booked
              </Badge>
            ) : isAvailable ? (
              <Badge variant="secondary">
                {availableSlots} slot{availableSlots !== 1 ? "s" : ""} left
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Full
              </Badge>
            )}
          </div>
        </div>

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
                {[shift.site.city, shift.site.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {bookedCount}/{shift.capacity} booked
            </span>
          </div>

          {shift.course && (
            <div className="col-span-2">
              <Badge variant="outline">{shift.course.title}</Badge>
            </div>
          )}
        </div>

        {shift.notes && (
          <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
            {shift.notes}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          {showBookButton && !isBooked && (
            <Button
              onClick={onBook}
              disabled={!isAvailable}
              className="flex-1 mr-2"
            >
              {isAvailable ? "Book This Shift" : "Shift Full"}
            </Button>
          )}

          {showActions && (
            <div className="flex items-center gap-2 ml-auto">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

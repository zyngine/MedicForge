"use client";

import { useState } from "react";
import { Button, Modal, Card, CardContent } from "@/components/ui";
import { Calendar, Clock, MapPin, Building2, AlertCircle } from "lucide-react";
import type { ClinicalShiftWithDetails } from "@/types";
import { format, parseISO } from "date-fns";

interface BookingButtonProps {
  shift: ClinicalShiftWithDetails;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function BookingButton({
  shift,
  onConfirm,
  disabled = false,
  className = "",
}: BookingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book shift");
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

  const formattedDate = format(parseISO(shift.shift_date), "EEEE, MMMM d, yyyy");

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={className}
      >
        Book This Shift
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Booking"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            You are about to book the following clinical shift:
          </p>

          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-lg">{shift.title}</h4>

              {shift.site && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{shift.site.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </span>
              </div>

              {shift.site?.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>
                    {shift.site.address}
                    {shift.site.city && `, ${shift.site.city}`}
                    {shift.site.state && `, ${shift.site.state}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Once you book this shift, it will be
              reserved for you. Please make sure you can attend before
              confirming.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

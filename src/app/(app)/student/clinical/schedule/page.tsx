"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { ShiftCard, BookingButton, BookingCard } from "@/components/clinical";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useClinicalShifts } from "@/lib/hooks/use-clinical-shifts";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import { useMyBookings } from "@/lib/hooks/use-shift-bookings";
import { format, addDays, startOfWeek, addWeeks, isSameDay } from "date-fns";

export default function ClinicalSchedulePage() {
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Fetch real data from hooks
  const { sites, isLoading: sitesLoading } = useClinicalSites();
  const { shifts, isLoading: shiftsLoading, refetch: refetchShifts } = useClinicalShifts({
    startDate: format(new Date(), "yyyy-MM-dd"),
  });
  const {
    bookings,
    isLoading: bookingsLoading,
    bookShift,
    cancelBooking,
    refetch: refetchBookings,
  } = useMyBookings();

  const isLoading = sitesLoading || shiftsLoading || bookingsLoading;

  // Get booked shift IDs for the current student
  const bookedShiftIds = new Set(
    bookings.filter((b) => b.status === "booked").map((b) => b.shift_id)
  );

  // Filter shifts by selected site
  const filteredShifts = shifts.filter(
    (shift) => selectedSite === "all" || shift.site_id === selectedSite
  );

  // Group shifts by date for calendar view
  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredShifts.filter((shift) => shift.shift_date === dateStr);
  };

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const handleBookShift = async (shiftId: string) => {
    try {
      await bookShift(shiftId);
      // Refetch both shifts and bookings to update availability
      await Promise.all([refetchShifts(), refetchBookings()]);
    } catch (error) {
      // Error is handled by the hook
      console.error("Failed to book shift:", error);
    }
  };

  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    try {
      await cancelBooking(bookingId, reason);
      await refetchShifts();
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === "booked");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/student/clinical"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clinical Tracker
          </Link>
          <h1 className="text-2xl font-bold">Clinical Schedule</h1>
          <p className="text-muted-foreground">
            View available shifts and book your clinical rotations
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetchShifts(); refetchBookings(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* My Bookings Summary */}
      {activeBookings.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Upcoming Shifts ({activeBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {activeBookings.slice(0, 2).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={(reason) => handleCancelBooking(booking.id, reason)}
                  showDocumentButton={false}
                />
              ))}
            </div>
            {activeBookings.length > 2 && (
              <Button variant="link" asChild className="mt-4">
                <Link href="/student/clinical/my-shifts">
                  View all {activeBookings.length} booked shifts
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="calendar">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Site Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="all">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {format(weekDates[0], "MMM d")} - {format(weekDates[6], "MMM d, yyyy")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {weekDates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className="text-center text-sm font-medium p-2"
                  >
                    <div className="text-muted-foreground">
                      {format(date, "EEE")}
                    </div>
                    <div
                      className={`text-lg ${
                        isSameDay(date, new Date())
                          ? "text-primary font-bold"
                          : ""
                      }`}
                    >
                      {format(date, "d")}
                    </div>
                  </div>
                ))}

                {/* Day Cells with Shifts */}
                {weekDates.map((date) => {
                  const dayShifts = getShiftsForDate(date);
                  const isPast = date < new Date();

                  return (
                    <div
                      key={`shifts-${date.toISOString()}`}
                      className={`min-h-[120px] border rounded-lg p-2 ${
                        isPast ? "bg-muted/50 opacity-60" : "bg-card"
                      }`}
                    >
                      {dayShifts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No shifts
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {dayShifts.map((shift) => {
                            const isBooked = bookedShiftIds.has(shift.id);
                            return (
                              <div
                                key={shift.id}
                                className={`text-xs p-2 rounded ${
                                  isBooked
                                    ? "bg-green-100 border border-green-300 dark:bg-green-900/30 dark:border-green-700"
                                    : shift.is_available
                                    ? "bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer dark:bg-blue-900/20 dark:border-blue-700"
                                    : "bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                                }`}
                                title={`${shift.title} at ${shift.site?.name}`}
                              >
                                <div className="font-medium truncate">
                                  {shift.start_time.slice(0, 5)}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {shift.site?.name}
                                </div>
                                {isBooked && (
                                  <Badge className="text-[10px] h-4 mt-1 bg-green-600">
                                    Booked
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <div className="space-y-4">
            {filteredShifts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Available Shifts
                  </h3>
                  <p className="text-muted-foreground">
                    Check back later for new clinical opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredShifts.map((shift) => {
                  const isBooked = bookedShiftIds.has(shift.id);
                  return (
                    <div key={shift.id} className="relative">
                      <ShiftCard
                        shift={shift}
                        showActions={false}
                        showBookButton={!isBooked}
                        isBooked={isBooked}
                        onBook={
                          !isBooked && shift.is_available
                            ? () => handleBookShift(shift.id)
                            : undefined
                        }
                      />
                      {!isBooked && shift.is_available && (
                        <div className="absolute bottom-4 right-4">
                          <BookingButton
                            shift={shift}
                            onConfirm={async () => {
                              await handleBookShift(shift.id);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

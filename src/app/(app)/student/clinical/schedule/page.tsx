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
} from "lucide-react";
import type {
  ClinicalShiftWithDetails,
  ShiftBookingWithDetails,
  ClinicalSite,
} from "@/types";
import { format, addDays, startOfWeek, addWeeks, isSameDay, parseISO } from "date-fns";

// Mock data
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
];

const generateMockShifts = (): ClinicalShiftWithDetails[] => {
  const today = new Date();
  const shifts: ClinicalShiftWithDetails[] = [];

  // Generate shifts for the next 2 weeks
  for (let i = 1; i <= 14; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");

    // Day shift at hospital
    if (i % 2 === 0) {
      shifts.push({
        id: `s${i}a`,
        tenant_id: "t1",
        site_id: "1",
        course_id: null,
        title: "Day Shift - 12 Hours",
        shift_date: dateStr,
        start_time: "07:00",
        end_time: "19:00",
        capacity: 2,
        notes: "Report to EMS station at 0645",
        created_by: "admin1",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        site: mockSites[0],
        bookings_count: i === 2 ? 2 : i === 4 ? 1 : 0,
        available_slots: i === 2 ? 0 : i === 4 ? 1 : 2,
        is_available: i !== 2,
      });
    }

    // Night shift at hospital
    if (i % 3 === 0) {
      shifts.push({
        id: `s${i}b`,
        tenant_id: "t1",
        site_id: "1",
        course_id: null,
        title: "Night Shift - 12 Hours",
        shift_date: dateStr,
        start_time: "19:00",
        end_time: "07:00",
        capacity: 1,
        notes: null,
        created_by: "admin1",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        site: mockSites[0],
        bookings_count: i === 3 ? 1 : 0,
        available_slots: i === 3 ? 0 : 1,
        is_available: i !== 3,
      });
    }

    // Fire station shifts
    if (i % 4 === 0) {
      shifts.push({
        id: `s${i}c`,
        tenant_id: "t1",
        site_id: "2",
        course_id: null,
        title: "24-Hour Shift",
        shift_date: dateStr,
        start_time: "08:00",
        end_time: "08:00",
        capacity: 2,
        notes: "Bring turnout gear",
        created_by: "admin1",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        site: mockSites[1],
        bookings_count: 0,
        available_slots: 2,
        is_available: true,
      });
    }
  }

  return shifts;
};

const mockBookings: ShiftBookingWithDetails[] = [
  {
    id: "b1",
    tenant_id: "t1",
    shift_id: "s4a",
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
    shift: {
      id: "s4a",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Day Shift - 12 Hours",
      shift_date: format(addDays(new Date(), 4), "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "19:00",
      capacity: 2,
      notes: "Report to EMS station at 0645",
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSites[0],
    },
  },
];

export default function ClinicalSchedulePage() {
  const [shifts] = useState<ClinicalShiftWithDetails[]>(generateMockShifts());
  const [bookings, setBookings] = useState<ShiftBookingWithDetails[]>(mockBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

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
    // TODO: Replace with actual API call using book_clinical_shift function
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const newBooking: ShiftBookingWithDetails = {
      id: Date.now().toString(),
      tenant_id: "t1",
      shift_id: shiftId,
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
      shift: shift,
    };

    setBookings([...bookings, newBooking]);
  };

  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    // TODO: Replace with actual API call
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              cancelled_at: new Date().toISOString(),
              cancellation_reason: reason || null,
            }
          : b
      )
    );
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
              {mockSites.map((site) => (
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
                                    ? "bg-green-100 border border-green-300"
                                    : shift.is_available
                                    ? "bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                                    : "bg-gray-100 border border-gray-200"
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

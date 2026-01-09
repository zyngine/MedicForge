"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { BookingCard } from "@/components/clinical";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { ShiftBookingWithDetails, ClinicalSite, BookingStatus } from "@/types";
import { format, addDays, parseISO, isPast } from "date-fns";

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
  preceptors: [],
  notes: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
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
    shift: {
      id: "s1",
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
      site: mockSite,
    },
  },
  {
    id: "b2",
    tenant_id: "t1",
    shift_id: "s2",
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
      id: "s2",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Night Shift - 12 Hours",
      shift_date: format(addDays(new Date(), 8), "yyyy-MM-dd"),
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
  {
    id: "b3",
    tenant_id: "t1",
    shift_id: "s3",
    student_id: "student1",
    status: "completed",
    booked_at: format(addDays(new Date(), -10), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    cancelled_at: null,
    cancellation_reason: null,
    check_in_time: format(addDays(new Date(), -5), "yyyy-MM-dd") + "T07:00:00Z",
    check_out_time: format(addDays(new Date(), -5), "yyyy-MM-dd") + "T19:00:00Z",
    hours_completed: 12,
    preceptor_name: "Mike Thompson",
    preceptor_signature: "signature",
    notes: "Great shift!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: {
      id: "s3",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Day Shift - 12 Hours",
      shift_date: format(addDays(new Date(), -5), "yyyy-MM-dd"),
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
    id: "b4",
    tenant_id: "t1",
    shift_id: "s4",
    student_id: "student1",
    status: "cancelled",
    booked_at: format(addDays(new Date(), -15), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    cancelled_at: format(addDays(new Date(), -12), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    cancellation_reason: "Schedule conflict",
    check_in_time: null,
    check_out_time: null,
    hours_completed: null,
    preceptor_name: null,
    preceptor_signature: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    shift: {
      id: "s4",
      tenant_id: "t1",
      site_id: "1",
      course_id: null,
      title: "Night Shift - 12 Hours",
      shift_date: format(addDays(new Date(), -10), "yyyy-MM-dd"),
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

const STATUS_TABS: { value: BookingStatus | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Shifts", icon: <Calendar className="h-4 w-4" /> },
  { value: "booked", label: "Upcoming", icon: <Clock className="h-4 w-4" /> },
  { value: "completed", label: "Completed", icon: <CheckCircle className="h-4 w-4" /> },
  { value: "cancelled", label: "Cancelled", icon: <XCircle className="h-4 w-4" /> },
];

export default function MyShiftsPage() {
  const [bookings, setBookings] = useState<ShiftBookingWithDetails[]>(mockBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");

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

  const filteredBookings =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  // Sort by shift date
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateA = a.shift?.shift_date || "";
    const dateB = b.shift?.shift_date || "";
    return dateB.localeCompare(dateA);
  });

  // Stats
  const stats = {
    upcoming: bookings.filter((b) => b.status === "booked").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    totalHours: bookings
      .filter((b) => b.status === "completed" && b.hours_completed)
      .reduce((sum, b) => sum + (b.hours_completed || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">My Clinical Shifts</h1>
        <p className="text-muted-foreground">
          View and manage your booked clinical rotations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-sm text-muted-foreground">Upcoming Shifts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed Shifts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHours}</p>
              <p className="text-sm text-muted-foreground">Hours Logged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BookingStatus | "all")}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
                {tab.value !== "all" && (
                  <Badge variant="secondary" className="ml-1">
                    {bookings.filter((b) =>
                      tab.value === "all" ? true : b.status === tab.value
                    ).length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {sortedBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Shifts Found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === "booked"
                    ? "You don't have any upcoming shifts booked."
                    : activeTab === "completed"
                    ? "You haven't completed any shifts yet."
                    : activeTab === "cancelled"
                    ? "You haven't cancelled any shifts."
                    : "You haven't booked any shifts yet."}
                </p>
                <Button asChild>
                  <Link href="/student/clinical/schedule">Book a Shift</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={(reason) => handleCancelBooking(booking.id, reason)}
                  showCancelButton={booking.status === "booked"}
                  showDocumentButton={booking.status === "completed"}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

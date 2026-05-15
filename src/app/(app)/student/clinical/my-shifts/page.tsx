"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { BookingCard, PreceptorRatingModal, FileComplaintModal } from "@/components/clinical";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Hourglass,
  RefreshCw,
  Star,
  Flag,
} from "lucide-react";
import { useMyBookings } from "@/lib/hooks/use-shift-bookings";
import type { BookingStatus } from "@/types";

const CANCELLABLE_STATUSES = ["booked", "poc_approved", "pending_poc_approval"];

const STATUS_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Shifts", icon: <Calendar className="h-4 w-4" /> },
  { value: "upcoming", label: "Upcoming", icon: <Clock className="h-4 w-4" /> },
  { value: "pending_poc_approval", label: "Pending Approval", icon: <Hourglass className="h-4 w-4" /> },
  { value: "completed", label: "Completed", icon: <CheckCircle className="h-4 w-4" /> },
  { value: "cancelled", label: "Cancelled", icon: <XCircle className="h-4 w-4" /> },
];

export default function MyShiftsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState<string | undefined>(undefined);
  const [ratingPreceptorName, setRatingPreceptorName] = useState<string | undefined>(undefined);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintBookingId, setComplaintBookingId] = useState<string | undefined>(undefined);
  const [complaintPreceptorName, setComplaintPreceptorName] = useState<string | undefined>(undefined);

  // Fetch real bookings data
  const {
    bookings,
    isLoading,
    cancelMyBooking,
    refetch,
  } = useMyBookings();

  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    try {
      await cancelMyBooking(bookingId, reason);
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    }
  };

  const filteredBookings = (() => {
    if (activeTab === "all") return bookings;
    if (activeTab === "upcoming") return bookings.filter((b) => ["booked", "poc_approved"].includes(b.status));
    return bookings.filter((b) => b.status === activeTab);
  })();

  // Sort by shift date
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateA = a.shift?.shift_date || "";
    const dateB = b.shift?.shift_date || "";
    return dateB.localeCompare(dateA);
  });

  // Stats
  const stats = {
    upcoming: bookings.filter((b) => ["booked", "poc_approved"].includes(b.status)).length,
    pending: bookings.filter((b) => b.status === "pending_poc_approval").length,
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
      <div className="flex items-center justify-between">
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
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
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
          {STATUS_TABS.map((tab) => {
            const count = tab.value === "all"
              ? bookings.length
              : tab.value === "upcoming"
              ? bookings.filter((b) => ["booked", "poc_approved"].includes(b.status)).length
              : bookings.filter((b) => b.status === tab.value).length;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
            );
          })}
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
                <div key={booking.id} className="space-y-2">
                  <BookingCard
                    booking={booking}
                    onCancel={(reason) => handleCancelBooking(booking.id, reason)}
                    showCancelButton={CANCELLABLE_STATUSES.includes(booking.status)}
                    showDocumentButton={booking.status === "completed"}
                  />
                  {booking.status === "completed" && (
                    <div className="flex gap-2 px-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setRatingBookingId(booking.id);
                          setRatingPreceptorName(booking.preceptor_name || undefined);
                          setRatingOpen(true);
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Rate Preceptor
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => {
                          setComplaintBookingId(booking.id);
                          setComplaintPreceptorName(booking.preceptor_name || undefined);
                          setComplaintOpen(true);
                        }}
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Report concern
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PreceptorRatingModal
        isOpen={ratingOpen}
        onClose={() => setRatingOpen(false)}
        bookingId={ratingBookingId}
        defaultPreceptorName={ratingPreceptorName}
        onSaved={refetch}
      />
      <FileComplaintModal
        isOpen={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        defaultSubjectType="preceptor"
        defaultSubjectName={complaintPreceptorName}
        defaultBookingId={complaintBookingId}
      />
    </div>
  );
}

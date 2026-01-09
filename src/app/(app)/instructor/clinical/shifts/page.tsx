"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
} from "@/components/ui";
import { ShiftCard } from "@/components/clinical";
import {
  ArrowLeft,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Building2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useClinicalShifts } from "@/lib/hooks/use-clinical-shifts";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import { useShiftBookings } from "@/lib/hooks/use-shift-bookings";
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  isSameDay,
} from "date-fns";

export default function InstructorShiftsPage() {
  const searchParams = useSearchParams();
  const siteFilter = searchParams.get("site");

  const [selectedSite, setSelectedSite] = useState<string>(siteFilter || "all");
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  // Fetch real data from hooks
  const { sites, isLoading: sitesLoading } = useClinicalSites();
  const { shifts, isLoading: shiftsLoading, deleteShift, refetch: refetchShifts } = useClinicalShifts();
  const { bookings, isLoading: bookingsLoading } = useShiftBookings();

  const isLoading = sitesLoading || shiftsLoading || bookingsLoading;

  const filteredShifts = shifts.filter(
    (shift) => selectedSite === "all" || shift.site_id === selectedSite
  );

  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredShifts.filter((shift) => shift.shift_date === dateStr);
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Stats
  const stats = {
    total: shifts.length,
    upcoming: shifts.filter(
      (s) => new Date(s.shift_date) >= new Date() && s.is_available
    ).length,
    fullyBooked: shifts.filter((s) => s.bookings_count === s.capacity).length,
    totalBookings: shifts.reduce((sum, s) => sum + (s.bookings_count || 0), 0),
  };

  const handleEditShift = (shiftId: string) => {
    window.location.href = `/instructor/clinical/shifts/${shiftId}/edit`;
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      await deleteShift(shiftId);
    }
  };

  const handleViewBookings = (shiftId: string) => {
    window.location.href = `/instructor/clinical/shifts/${shiftId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
            href="/instructor/clinical"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clinical Management
          </Link>
          <h1 className="text-2xl font-bold">Clinical Shifts</h1>
          <p className="text-muted-foreground">
            Manage shifts and view student bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchShifts()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/instructor/clinical/shifts/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Shifts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
              <p className="text-xs text-muted-foreground">Bookings</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.fullyBooked}</p>
              <p className="text-xs text-muted-foreground">Fully Booked</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  {format(weekDates[0], "MMM d")} -{" "}
                  {format(weekDates[6], "MMM d, yyyy")}
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
                  const isDatePast = date < new Date();

                  return (
                    <div
                      key={`shifts-${date.toISOString()}`}
                      className={`min-h-[140px] border rounded-lg p-2 ${
                        isDatePast ? "bg-muted/50 opacity-60" : "bg-card"
                      }`}
                    >
                      {dayShifts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No shifts
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                                shift.bookings_count === shift.capacity
                                  ? "bg-green-100 border border-green-300 hover:bg-green-150 dark:bg-green-900/30 dark:border-green-700"
                                  : shift.bookings_count && shift.bookings_count > 0
                                  ? "bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-700"
                                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
                              }`}
                              onClick={() => handleViewBookings(shift.id)}
                              title={`${shift.title} at ${shift.site?.name}`}
                            >
                              <div className="font-medium truncate">
                                {shift.start_time.slice(0, 5)}
                              </div>
                              <div className="text-muted-foreground truncate">
                                {shift.site?.name}
                              </div>
                              <Badge
                                variant={
                                  shift.bookings_count === shift.capacity
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px] h-4 mt-1"
                              >
                                {shift.bookings_count}/{shift.capacity}
                              </Badge>
                            </div>
                          ))}
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
                  <h3 className="text-lg font-semibold mb-2">No Shifts Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first shift to get started.
                  </p>
                  <Button asChild>
                    <Link href="/instructor/clinical/shifts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Shift
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredShifts
                  .sort(
                    (a, b) =>
                      new Date(a.shift_date).getTime() -
                      new Date(b.shift_date).getTime()
                  )
                  .map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      showActions={true}
                      onEdit={() => handleEditShift(shift.id)}
                      onDelete={() => handleDeleteShift(shift.id)}
                      onViewBookings={() => handleViewBookings(shift.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

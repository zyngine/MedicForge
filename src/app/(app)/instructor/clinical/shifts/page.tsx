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
} from "lucide-react";
import type { ClinicalShiftWithDetails, ClinicalSite } from "@/types";
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  isSameDay,
  parseISO,
  isPast,
} from "date-fns";

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

  for (let i = -3; i <= 14; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");

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
        bookings_count: i < 0 ? 2 : i === 2 ? 2 : i === 4 ? 1 : 0,
        available_slots: i < 0 ? 0 : i === 2 ? 0 : i === 4 ? 1 : 2,
        is_available: i >= 0 && i !== 2,
      });
    }

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
        bookings_count: i < 0 ? 1 : i === 3 ? 1 : 0,
        available_slots: i < 0 ? 0 : i === 3 ? 0 : 1,
        is_available: i >= 0 && i !== 3,
      });
    }

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
        bookings_count: i < 0 ? 1 : 0,
        available_slots: i < 0 ? 1 : 2,
        is_available: i >= 0,
      });
    }
  }

  return shifts;
};

export default function InstructorShiftsPage() {
  const searchParams = useSearchParams();
  const siteFilter = searchParams.get("site");

  const [shifts] = useState<ClinicalShiftWithDetails[]>(generateMockShifts());
  const [selectedSite, setSelectedSite] = useState<string>(siteFilter || "all");
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

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
    // TODO: Navigate to edit page or open modal
    console.log("Edit shift:", shiftId);
  };

  const handleDeleteShift = (shiftId: string) => {
    // TODO: Implement delete
    console.log("Delete shift:", shiftId);
  };

  const handleViewBookings = (shiftId: string) => {
    window.location.href = `/instructor/clinical/shifts/${shiftId}`;
  };

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
        <Button asChild>
          <Link href="/instructor/clinical/shifts/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
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
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
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
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
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
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
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
                                  ? "bg-green-100 border border-green-300 hover:bg-green-150"
                                  : shift.bookings_count && shift.bookings_count > 0
                                  ? "bg-yellow-50 border border-yellow-200 hover:bg-yellow-100"
                                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
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

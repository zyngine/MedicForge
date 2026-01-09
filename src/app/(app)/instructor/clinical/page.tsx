"use client";

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
} from "@/components/ui";
import {
  Building2,
  Calendar,
  Users,
  ClipboardCheck,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import { useClinicalShifts } from "@/lib/hooks/use-clinical-shifts";
import { useShiftBookings } from "@/lib/hooks/use-shift-bookings";
import { usePatientContacts } from "@/lib/hooks/use-patient-contacts";

export default function InstructorClinicalPage() {
  const today = startOfToday();
  const nextWeek = format(addDays(today, 7), "yyyy-MM-dd");

  const { sites, isLoading: sitesLoading } = useClinicalSites();
  const { shifts, isLoading: shiftsLoading } = useClinicalShifts({
    startDate: format(today, "yyyy-MM-dd"),
    endDate: nextWeek,
  });
  const { bookings, isLoading: bookingsLoading } = useShiftBookings({ status: "booked" });
  const {
    contacts: pendingContacts,
    isLoading: contactsLoading,
    verifyContact,
    rejectContact,
  } = usePatientContacts({ status: "pending" });

  const isLoading = sitesLoading || shiftsLoading || bookingsLoading || contactsLoading;

  // Calculate stats
  const stats = {
    totalSites: sites.length,
    activeShifts: shifts.filter(s => s.is_available).length,
    upcomingBookings: bookings.length,
    pendingVerifications: pendingContacts.length,
  };

  // Get upcoming shifts (next 7 days with bookings info)
  const upcomingShifts = shifts.slice(0, 5).map(shift => ({
    ...shift,
    bookingsList: bookings.filter(b => b.shift_id === shift.id),
  }));

  const handleVerify = async (contactId: string) => {
    await verifyContact(contactId);
  };

  const handleReject = async (contactId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      await rejectContact(contactId, reason);
    }
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
          <h1 className="text-2xl font-bold">Clinical Management</h1>
          <p className="text-muted-foreground">
            Manage clinical sites, shifts, and student documentation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/instructor/clinical/sites">
              <Building2 className="h-4 w-4 mr-2" />
              Manage Sites
            </Link>
          </Button>
          <Button asChild>
            <Link href="/instructor/clinical/shifts/new">
              <Calendar className="h-4 w-4 mr-2" />
              Create Shift
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSites}</p>
                <p className="text-xs text-muted-foreground">Clinical Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeShifts}</p>
                <p className="text-xs text-muted-foreground">Available Shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                <p className="text-xs text-muted-foreground">Active Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Shifts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Shifts</CardTitle>
              <CardDescription>Shifts scheduled in the next 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/clinical/shifts">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming shifts</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/instructor/clinical/shifts/new">Create a shift</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingShifts.map((shift) => (
                  <Link
                    key={shift.id}
                    href={`/instructor/clinical/shifts/${shift.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{shift.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.site?.name} - {format(new Date(shift.shift_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          shift.bookings_count === shift.capacity
                            ? "default"
                            : shift.bookings_count && shift.bookings_count > 0
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {shift.bookings_count || 0}/{shift.capacity} booked
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Pending Verifications
                {pendingContacts.length > 0 && (
                  <Badge variant="destructive">{pendingContacts.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Patient contacts awaiting review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/clinical/patient-contacts">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All caught up!</p>
                <p className="text-sm">No pending verifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingContacts.slice(0, 5).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{contact.student?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {contact.patient_age_range} - {contact.chief_complaint || "No complaint listed"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.created_at && format(new Date(contact.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleVerify(contact.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(contact.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link href="/instructor/clinical/sites">
                <Building2 className="h-6 w-6 mb-2" />
                <span>Manage Sites</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link href="/instructor/clinical/shifts">
                <Calendar className="h-6 w-6 mb-2" />
                <span>View All Shifts</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link href="/instructor/clinical/shifts/new">
                <Clock className="h-6 w-6 mb-2" />
                <span>Create Shift</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link href="/instructor/clinical/patient-contacts">
                <FileText className="h-6 w-6 mb-2" />
                <span>Review Contacts</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

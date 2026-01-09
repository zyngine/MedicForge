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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Building2,
  Calendar,
  Users,
  ClipboardCheck,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { format, addDays } from "date-fns";

// Mock data
const stats = {
  totalSites: 5,
  activeShifts: 12,
  upcomingBookings: 8,
  pendingVerifications: 15,
  hoursThisMonth: 156,
};

const upcomingShifts = [
  {
    id: "1",
    title: "Day Shift - 12 Hours",
    site: "Memorial Hospital",
    date: format(addDays(new Date(), 1), "MMM d, yyyy"),
    time: "07:00 - 19:00",
    booked: 2,
    capacity: 2,
    students: ["John Smith", "Jane Doe"],
  },
  {
    id: "2",
    title: "Night Shift - 12 Hours",
    site: "Memorial Hospital",
    date: format(addDays(new Date(), 2), "MMM d, yyyy"),
    time: "19:00 - 07:00",
    booked: 1,
    capacity: 2,
    students: ["Mike Johnson"],
  },
  {
    id: "3",
    title: "24-Hour Shift",
    site: "County Fire & Rescue",
    date: format(addDays(new Date(), 3), "MMM d, yyyy"),
    time: "08:00 - 08:00",
    booked: 0,
    capacity: 2,
    students: [],
  },
];

const pendingVerifications = [
  {
    id: "1",
    student: "John Smith",
    type: "Patient Contact",
    date: format(addDays(new Date(), -1), "MMM d, yyyy"),
    site: "Memorial Hospital",
    details: "65 y/o Male - Chest Pain",
  },
  {
    id: "2",
    student: "Jane Doe",
    type: "Clinical Hours",
    date: format(addDays(new Date(), -2), "MMM d, yyyy"),
    site: "Metro Ambulance",
    details: "8 hours completed",
  },
  {
    id: "3",
    student: "Mike Johnson",
    type: "Patient Contact",
    date: format(addDays(new Date(), -2), "MMM d, yyyy"),
    site: "County Fire & Rescue",
    details: "28 y/o Female - MVA",
  },
  {
    id: "4",
    student: "Sarah Williams",
    type: "Patient Contact",
    date: format(addDays(new Date(), -3), "MMM d, yyyy"),
    site: "Memorial Hospital",
    details: "45 y/o Male - Syncope",
  },
];

const recentActivity = [
  {
    id: "1",
    action: "Shift booked",
    student: "John Smith",
    details: "Day Shift at Memorial Hospital",
    time: "2 hours ago",
  },
  {
    id: "2",
    action: "Patient contact submitted",
    student: "Jane Doe",
    details: "Awaiting verification",
    time: "3 hours ago",
  },
  {
    id: "3",
    action: "Hours verified",
    student: "Mike Johnson",
    details: "12 hours at County Fire",
    time: "5 hours ago",
  },
  {
    id: "4",
    action: "Booking cancelled",
    student: "Sarah Williams",
    details: "Night Shift - Schedule conflict",
    time: "1 day ago",
  },
];

export default function InstructorClinicalPage() {
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
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
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeShifts}</p>
                <p className="text-xs text-muted-foreground">Active Shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hoursThisMonth}</p>
                <p className="text-xs text-muted-foreground">Hours/Month</p>
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
            <div className="space-y-4">
              {upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{shift.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {shift.site} - {shift.date}
                      </p>
                      <p className="text-xs text-muted-foreground">{shift.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        shift.booked === shift.capacity
                          ? "default"
                          : shift.booked > 0
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {shift.booked}/{shift.capacity} booked
                    </Badge>
                    {shift.students.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {shift.students.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Pending Verifications
                <Badge variant="destructive">{pendingVerifications.length}</Badge>
              </CardTitle>
              <CardDescription>Patient contacts and hours awaiting review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/clinical/patient-contacts">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingVerifications.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                      {item.type === "Patient Contact" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.student}</p>
                      <p className="text-sm text-muted-foreground">{item.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.site} - {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-green-600">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest clinical activity from your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      activity.action.includes("booked")
                        ? "bg-green-100 text-green-600"
                        : activity.action.includes("submitted")
                        ? "bg-blue-100 text-blue-600"
                        : activity.action.includes("verified")
                        ? "bg-purple-100 text-purple-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {activity.action.includes("booked") ? (
                      <Calendar className="h-4 w-4" />
                    ) : activity.action.includes("submitted") ? (
                      <FileText className="h-4 w-4" />
                    ) : activity.action.includes("verified") ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{activity.student}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action} - {activity.details}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

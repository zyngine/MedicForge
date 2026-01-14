"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Modal,
  Input,
  Label,
  Textarea,
  Select,
} from "@/components/ui";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardList,
  Stethoscope,
} from "lucide-react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { formatDate } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "class" | "assignment" | "clinical" | "exam" | "meeting";
  courseId?: string;
  courseName?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

export default function InstructorCalendarPage() {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const courseIds = courses.map((c) => c.id);
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useAssignments({});

  // Filter assignments to only those in instructor's courses
  const assignments = allAssignments.filter(
    (a) => a.module?.course_id && courseIds.includes(a.module.course_id)
  );

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"month" | "week">("month");

  const isLoading = coursesLoading || assignmentsLoading;

  // Create a lookup map for course titles
  const courseMap = React.useMemo(() => {
    return new Map(courses.map((c) => [c.id, c.title]));
  }, [courses]);

  // Convert assignments to calendar events
  const events: CalendarEvent[] = React.useMemo(() => {
    return assignments
      .filter((a) => a.due_date)
      .map((a) => ({
        id: a.id,
        title: a.title,
        date: new Date(a.due_date!),
        type: a.type === "quiz" ? "exam" : "assignment",
        courseId: a.module?.course_id,
        courseName: a.module?.course_id ? courseMap.get(a.module.course_id) : undefined,
        description: a.description || undefined,
      }));
  }, [assignments, courseMap]);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (e) =>
        e.date.getFullYear() === date.getFullYear() &&
        e.date.getMonth() === date.getMonth() &&
        e.date.getDate() === date.getDate()
    );
  };

  const getEventTypeColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "class":
        return "bg-blue-500";
      case "assignment":
        return "bg-green-500";
      case "clinical":
        return "bg-purple-500";
      case "exam":
        return "bg-red-500";
      case "meeting":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEventTypeIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "class":
        return <BookOpen className="h-3 w-3" />;
      case "assignment":
        return <ClipboardList className="h-3 w-3" />;
      case "clinical":
        return <Stethoscope className="h-3 w-3" />;
      case "exam":
        return <ClipboardList className="h-3 w-3" />;
      case "meeting":
        return <Video className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Get upcoming events for sidebar
  const upcomingEvents = events
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 10);

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            Manage your schedule and deadlines
          </p>
        </div>
        <Button onClick={() => setShowEventModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border rounded-lg ${
                      date ? "hover:bg-muted/50 cursor-pointer" : ""
                    } ${date && isToday(date) ? "bg-primary/10 border-primary" : ""}`}
                    onClick={() => date && setSelectedDate(date)}
                  >
                    {date && (
                      <>
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isToday(date) ? "text-primary" : ""
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {getEventsForDate(date)
                            .slice(0, 3)
                            .map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate text-white ${getEventTypeColor(
                                  event.type
                                )}`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                          {getEventsForDate(date).length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{getEventsForDate(date).length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Class</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Assignment</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Exam/Quiz</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Clinical</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span>Meeting</span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-2">
                      <div
                        className={`p-1 rounded ${getEventTypeColor(event.type)} text-white`}
                      >
                        {getEventTypeIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.date.toISOString())}
                        </p>
                        {event.courseName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.courseName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Date Modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDate(selectedDate.toISOString()) : ""}
        size="md"
      >
        {selectedDate && (
          <div className="space-y-4">
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div
                      className={`p-2 rounded ${getEventTypeColor(event.type)} text-white`}
                    >
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.courseName}
                      </p>
                      {event.description && (
                        <p className="text-sm mt-1">{event.description}</p>
                      )}
                      {event.startTime && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Badge>{event.type}</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setShowEventModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Event Modal - Placeholder */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Add Event"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input placeholder="Enter event title" />
          </div>
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              options={[
                { value: "class", label: "Class" },
                { value: "assignment", label: "Assignment Due" },
                { value: "exam", label: "Exam/Quiz" },
                { value: "clinical", label: "Clinical" },
                { value: "meeting", label: "Meeting" },
              ]}
              placeholder="Select type"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Course (Optional)</Label>
            <Select
              options={courses.map((c) => ({ value: c.id, label: c.title }))}
              placeholder="Select course"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Event description..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEventModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEventModal(false)}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

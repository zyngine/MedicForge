"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  ClipboardList,
  BookOpen,
  Download,
} from "lucide-react";
import { CalendarSync } from "@/components/calendar";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: "class" | "lab" | "clinical" | "exam" | "other" | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  virtual_link: string | null;
  is_mandatory: boolean | null;
  course: {
    id: string;
    title: string;
  } | null;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  type: string | null;
  course_id: string;
  course: {
    id: string;
    title: string;
  } | null;
}

type CalendarItem =
  | { type: "event"; data: Event }
  | { type: "assignment"; data: Assignment };

const eventTypeColors: Record<string, string> = {
  class: "bg-blue-100 text-blue-700 border-blue-300",
  lab: "bg-purple-100 text-purple-700 border-purple-300",
  clinical: "bg-green-100 text-green-700 border-green-300",
  exam: "bg-red-100 text-red-700 border-red-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
  assignment: "bg-orange-100 text-orange-700 border-orange-300",
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  class: <BookOpen className="h-3 w-3" />,
  lab: <BookOpen className="h-3 w-3" />,
  clinical: <BookOpen className="h-3 w-3" />,
  exam: <ClipboardList className="h-3 w-3" />,
  assignment: <ClipboardList className="h-3 w-3" />,
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get start and end of current month view (including overflow days)
      const monthStart = startOfWeek(startOfMonth(currentMonth));
      const monthEnd = endOfWeek(endOfMonth(currentMonth));

      // Fetch user's enrollments to get course IDs
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("status", "active");

      const courseIds = enrollments?.map((e) => e.course_id) || [];

      if (courseIds.length > 0) {
        // Fetch events for enrolled courses
        const { data: eventsData } = await supabase
          .from("events")
          .select(`
            *,
            course:courses(id, title)
          `)
          .in("course_id", courseIds)
          .gte("start_time", monthStart.toISOString())
          .lte("start_time", monthEnd.toISOString())
          .order("start_time");

        if (eventsData) {
          setEvents(eventsData);
        }

        // Fetch assignments due in this month
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select(`
            id,
            title,
            due_date,
            type,
            module:modules!inner(
              course:courses!inner(id, title)
            )
          `)
          .not("due_date", "is", null)
          .gte("due_date", monthStart.toISOString())
          .lte("due_date", monthEnd.toISOString())
          .order("due_date");

        if (assignmentsData) {
          // Transform assignments to match our interface
          const transformedAssignments = assignmentsData.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            title: a.title as string,
            due_date: a.due_date as string,
            type: a.type as string | null,
            course_id: ((a.module as Record<string, unknown>)?.course as Record<string, unknown>)?.id as string,
            course: (a.module as Record<string, unknown>)?.course as { id: string; title: string } | null,
          }));
          setAssignments(transformedAssignments);
        }
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const getItemsForDay = (date: Date): CalendarItem[] => {
    const items: CalendarItem[] = [];

    // Add events for this day
    events
      .filter((event) => isSameDay(new Date(event.start_time), date))
      .forEach((event) => {
        items.push({ type: "event", data: event });
      });

    // Add assignments due this day
    assignments
      .filter((assignment) => isSameDay(new Date(assignment.due_date), date))
      .forEach((assignment) => {
        items.push({ type: "assignment", data: assignment });
      });

    return items;
  };

  const selectedDayItems = selectedDate ? getItemsForDay(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Calendar
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {days.map((day) => {
                const dayItems = getItemsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-[100px] p-2 bg-background text-left transition-colors
                      hover:bg-muted/50
                      ${!isCurrentMonth ? "text-muted-foreground bg-muted/30" : ""}
                      ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                      ${isToday(day) ? "bg-primary/5" : ""}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item, index) => (
                        <div
                          key={`${item.type}-${item.type === "event" ? item.data.id : item.data.id}-${index}`}
                          className={`text-xs px-1 py-0.5 rounded truncate border ${
                            item.type === "event"
                              ? eventTypeColors[item.data.event_type || "other"]
                              : eventTypeColors.assignment
                          }`}
                        >
                          {item.type === "event" ? item.data.title : item.data.title}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-muted-foreground text-sm">
                Click on a day to see events and assignments
              </p>
            ) : selectedDayItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No events or assignments for this day
              </p>
            ) : (
              <div className="space-y-4">
                {selectedDayItems.map((item) => (
                  <div
                    key={`${item.type}-${item.type === "event" ? item.data.id : item.data.id}`}
                    className={`p-3 rounded-lg border ${
                      item.type === "event"
                        ? eventTypeColors[item.data.event_type || "other"]
                        : eventTypeColors.assignment
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.type === "event"
                        ? eventTypeIcons[item.data.event_type || "other"]
                        : eventTypeIcons.assignment}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">
                          {item.type === "event" ? item.data.title : item.data.title}
                        </h4>
                        {item.type === "event" && item.data.course && (
                          <p className="text-xs opacity-75">{item.data.course.title}</p>
                        )}
                        {item.type === "assignment" && item.data.course && (
                          <p className="text-xs opacity-75">{item.data.course.title}</p>
                        )}

                        {item.type === "event" && (
                          <div className="mt-2 space-y-1 text-xs opacity-75">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(item.data.start_time), "h:mm a")}
                              {item.data.end_time && (
                                <> - {format(new Date(item.data.end_time), "h:mm a")}</>
                              )}
                            </div>
                            {item.data.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.data.location}
                              </div>
                            )}
                            {item.data.virtual_link && (
                              <div className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                <a
                                  href={item.data.virtual_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Join Virtual
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === "assignment" && (
                          <div className="mt-2 text-xs opacity-75">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {format(new Date(item.data.due_date), "h:mm a")}
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.type === "event"
                          ? item.data.event_type || "event"
                          : item.data.type || "assignment"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <span className="text-sm font-medium text-muted-foreground">Legend:</span>
            {Object.entries(eventTypeColors).map(([type, colorClass]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${colorClass.split(" ")[0]}`} />
                <span className="text-sm capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Sync Section */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export & Sync
        </h2>
        <CalendarSync />
      </div>
    </div>
  );
}

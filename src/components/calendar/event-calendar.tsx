"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  color?: string;
  type?: "class" | "assignment" | "exam" | "clinical" | "other";
  description?: string;
  location?: string;
  data?: Record<string, any>;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onAddClick?: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
  showAddButton?: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  assignment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  exam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  clinical: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export function EventCalendar({
  events,
  onEventClick,
  onDateClick,
  onAddClick,
  selectedDate,
  className,
  showAddButton = true,
}: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = typeof event.start === "string" ? parseISO(event.start) : event.start;
      return isSameDay(eventStart, date);
    });
  };

  const renderDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const dayEvents = getEventsForDate(currentDay);
      const isCurrentMonth = isSameMonth(currentDay, monthStart);
      const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
      const isTodayDate = isToday(currentDay);
      const isHovered = hoveredDate && isSameDay(currentDay, hoveredDate);

      days.push(
        <div
          key={day.toISOString()}
          className={cn(
            "min-h-24 p-1 border-b border-r cursor-pointer transition-colors",
            !isCurrentMonth && "bg-muted/50",
            isSelected && "bg-primary/10",
            isHovered && !isSelected && "bg-muted",
          )}
          onClick={() => onDateClick?.(currentDay)}
          onMouseEnter={() => setHoveredDate(currentDay)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                isTodayDate && "bg-primary text-primary-foreground font-bold",
                !isCurrentMonth && "text-muted-foreground"
              )}
            >
              {format(currentDay, "d")}
            </span>
            {showAddButton && isHovered && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick?.(currentDay);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={cn(
                  "block w-full text-left text-xs px-1.5 py-0.5 rounded truncate",
                  event.color || EVENT_COLORS[event.type || "other"]
                )}
              >
                {event.title}
              </button>
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs text-muted-foreground px-1.5">
                +{dayEvents.length - 3} more
              </span>
            )}
          </div>
        </div>
      );

      day = addDays(day, 1);
    }

    return days;
  };

  return (
    <div className={cn("bg-background rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">{renderDays()}</div>
    </div>
  );
}

// Week view component
interface WeekViewProps {
  events: CalendarEvent[];
  startDate?: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  className?: string;
}

export function WeekView({
  events,
  startDate = new Date(),
  onEventClick,
  onTimeSlotClick,
  className,
}: WeekViewProps) {
  const weekStart = startOfWeek(startDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDateAndHour = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = typeof event.start === "string" ? parseISO(event.start) : event.start;
      return isSameDay(eventStart, date) && eventStart.getHours() === hour;
    });
  };

  return (
    <div className={cn("bg-background rounded-lg border overflow-auto", className)}>
      {/* Day headers */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-8">
          <div className="w-16 border-r" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center border-r last:border-r-0",
                isToday(day) && "bg-primary/10"
              )}
            >
              <div className="text-sm font-medium">{format(day, "EEE")}</div>
              <div
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full text-lg",
                  isToday(day) && "bg-primary text-primary-foreground font-bold"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8">
        {/* Time column */}
        <div className="w-16 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 border-b text-xs text-muted-foreground pr-2 text-right"
            >
              {format(new Date().setHours(hour, 0, 0, 0), "h a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div key={day.toISOString()} className="border-r last:border-r-0">
            {hours.map((hour) => {
              const hourEvents = getEventsForDateAndHour(day, hour);
              return (
                <div
                  key={hour}
                  className="h-12 border-b cursor-pointer hover:bg-muted/50 relative"
                  onClick={() => onTimeSlotClick?.(day, hour)}
                >
                  {hourEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "absolute inset-x-0.5 top-0.5 text-xs px-1 py-0.5 rounded truncate text-left",
                        event.color || EVENT_COLORS[event.type || "other"]
                      )}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Agenda/list view
interface AgendaViewProps {
  events: CalendarEvent[];
  startDate?: Date;
  daysToShow?: number;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export function AgendaView({
  events,
  startDate = new Date(),
  daysToShow = 14,
  onEventClick,
  className,
}: AgendaViewProps) {
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const groupedEvents = days.map((day) => ({
    date: day,
    events: events.filter((event) => {
      const eventStart = typeof event.start === "string" ? parseISO(event.start) : event.start;
      return isSameDay(eventStart, day);
    }),
  }));

  const daysWithEvents = groupedEvents.filter((day) => day.events.length > 0);

  if (daysWithEvents.length === 0) {
    return (
      <div className={cn("bg-background rounded-lg border p-8 text-center", className)}>
        <p className="text-muted-foreground">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-background rounded-lg border divide-y", className)}>
      {daysWithEvents.map(({ date, events: dayEvents }) => (
        <div key={date.toISOString()} className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex flex-col items-center justify-center",
                isToday(date)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <span className="text-xs">{format(date, "EEE")}</span>
              <span className="text-lg font-bold">{format(date, "d")}</span>
            </div>
            <div>
              <div className="font-medium">{format(date, "EEEE")}</div>
              <div className="text-sm text-muted-foreground">
                {format(date, "MMMM d, yyyy")}
              </div>
            </div>
          </div>
          <div className="space-y-2 ml-15">
            {dayEvents.map((event) => {
              const eventStart = typeof event.start === "string"
                ? parseISO(event.start)
                : event.start;
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        event.type === "class" && "bg-blue-500",
                        event.type === "assignment" && "bg-purple-500",
                        event.type === "exam" && "bg-red-500",
                        event.type === "clinical" && "bg-green-500",
                        !event.type && "bg-gray-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.allDay
                          ? "All day"
                          : format(eventStart, "h:mm a")}
                        {event.location && ` • ${event.location}`}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini calendar for sidebars
export function MiniCalendar({
  selectedDate,
  onDateSelect,
  events,
  className,
}: {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: CalendarEvent[];
  className?: string;
}) {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const hasEvents = (date: Date) => {
    if (!events) return false;
    return events.some((event) => {
      const eventStart = typeof event.start === "string" ? parseISO(event.start) : event.start;
      return isSameDay(eventStart, date);
    });
  };

  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{format(currentMonth, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => onDateSelect?.(d)}
            className={cn(
              "relative w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors",
              !isSameMonth(d, monthStart) && "text-muted-foreground",
              isSameDay(d, selectedDate || new Date()) && "bg-primary text-primary-foreground",
              isToday(d) && !isSameDay(d, selectedDate || new Date()) && "border border-primary",
              "hover:bg-muted"
            )}
          >
            {format(d, "d")}
            {hasEvents(d) && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

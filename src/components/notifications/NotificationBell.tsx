"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications, Notification } from "@/lib/hooks/use-notifications";
import { Button, Badge, Spinner } from "@/components/ui";
import {
  Bell,
  ClipboardList,
  Award,
  Megaphone,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const notificationIcons: Record<Notification["type"], React.ReactNode> = {
  assignment: <ClipboardList className="h-4 w-4" />,
  grade: <Award className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
  reminder: <Clock className="h-4 w-4" />,
};

const notificationColors: Record<Notification["type"], string> = {
  assignment: "bg-blue-100 text-blue-600",
  grade: "bg-green-100 text-green-600",
  announcement: "bg-purple-100 text-purple-600",
  reminder: "bg-orange-100 text-orange-600",
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        className="flex items-start gap-3"
                      >
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">
                        <NotificationContent notification={notification} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 10 && (
            <div className="p-2 border-t">
              <Link href="/student/notifications">
                <Button variant="ghost" className="w-full text-sm">
                  View all notifications
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationContent({ notification }: { notification: Notification }) {
  return (
    <>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          notificationColors[notification.type]
        }`}
      >
        {notificationIcons[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate">{notification.title}</p>
          {!notification.is_read && (
            <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {notification.created_at
            ? formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })
            : "Unknown"}
        </p>
      </div>
    </>
  );
}

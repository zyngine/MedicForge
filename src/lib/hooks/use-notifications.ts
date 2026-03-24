"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Singleton supabase client
const supabase = createClient();

export interface Notification {
  id: string;
  type: "assignment" | "grade" | "announcement" | "reminder";
  title: string;
  message: string;
  link: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mountedRef.current) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mountedRef.current) return;

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (err) {
      // Ignore AbortErrors - expected during navigation/unmount
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Error fetching notifications:", err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();

    // Subscribe to real-time notifications for this user only
    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mountedRef.current) return null;

      return supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (mountedRef.current) {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            }
          }
        )
        .subscribe();
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    setupSubscription().then((ch) => {
      channel = ch;
    });

    return () => {
      mountedRef.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error && mountedRef.current) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error && mountedRef.current) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

// Helper to create notifications
export async function createNotification(
  userId: string,
  tenantId: string,
  notification: Omit<Notification, "id" | "is_read" | "created_at">
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    tenant_id: tenantId,
    ...notification,
  });

  if (error) {
    console.error("Error creating notification:", error);
  }
}

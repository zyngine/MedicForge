"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { useServiceWorker } from "./use-service-worker";

export interface PushSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  tenant_id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  push_assignments: boolean;
  push_grades: boolean;
  push_announcements: boolean;
  push_reminders: boolean;
  push_messages: boolean;
  email_assignments: boolean;
  email_grades: boolean;
  email_announcements: boolean;
  email_reminders: boolean;
  email_messages: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

// Helper to get db with type assertion for new tables
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

// Get VAPID public key from environment
function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

// Hook for managing push notification subscriptions
export function usePushSubscription() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const {
    isSupported,
    isRegistered,
    registration,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
  } = useServiceWorker();

  // Check if push notifications are supported and available
  const isPushSupported = isSupported && isRegistered && "PushManager" in window;

  // Get current subscription status
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["push-subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data as PushSubscription[];
    },
    enabled: !!user?.id,
  });

  const isSubscribed = (subscriptions?.length ?? 0) > 0;

  // Subscribe to push notifications
  const subscribe = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");
      if (!isPushSupported) throw new Error("Push notifications not supported");

      // Request permission first
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission denied");
      }

      const vapidPublicKey = getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error("VAPID public key not configured");
      }

      // Subscribe via service worker
      const pushSubscription = await subscribeToPush(vapidPublicKey);
      if (!pushSubscription) {
        throw new Error("Failed to create push subscription");
      }

      const keys = pushSubscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error("Invalid push subscription keys");
      }

      // Save to database
      const db = getDb();
      const { data, error } = await db
        .from("push_subscriptions")
        .upsert({
          tenant_id: tenant.id,
          user_id: user.id,
          endpoint: pushSubscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          is_active: true,
        }, {
          onConflict: "user_id,endpoint",
        })
        .select()
        .single();

      if (error) throw error;
      return data as PushSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
    },
  });

  // Unsubscribe from push notifications
  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      // Unsubscribe via service worker
      await unsubscribeFromPush();

      // Mark all subscriptions as inactive
      const db = getDb();
      const { error } = await db
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
    },
  });

  return {
    isPushSupported,
    isSubscribed,
    isLoading,
    subscriptions,
    subscribe: subscribe.mutateAsync,
    unsubscribe: unsubscribe.mutateAsync,
    isSubscribing: subscribe.isPending,
    isUnsubscribing: unsubscribe.isPending,
    subscribeError: subscribe.error,
    unsubscribeError: unsubscribe.error,
  };
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return null;

      const db = getDb();
      // Try to get existing preferences
      let { data, error } = await db
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If not found, create default preferences
      if (error?.code === "PGRST116") {
        const { data: newData, error: insertError } = await db
          .from("notification_preferences")
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      } else if (error) {
        throw error;
      }

      return data as NotificationPreferences;
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { data, error } = await db
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutateAsync,
    isUpdating: updatePreferences.isPending,
    error: updatePreferences.error,
  };
}

// Hook to check notification permission status
export function useNotificationPermission() {
  const { requestNotificationPermission } = useServiceWorker();

  const getPermissionStatus = (): NotificationPermission | "unsupported" => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  };

  return {
    permission: getPermissionStatus(),
    requestPermission: requestNotificationPermission,
    isSupported: typeof window !== "undefined" && "Notification" in window,
  };
}

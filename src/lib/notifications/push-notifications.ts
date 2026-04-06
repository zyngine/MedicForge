"use client";

// Push notification utilities for PWA

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Check current permission status
export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// Request notification permission
export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    throw new Error("Notifications not supported");
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Get existing push subscription
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error("Error getting push subscription:", error);
    return null;
  }
}

// Subscribe to push notifications
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // Convert to our format
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
        auth: arrayBufferToBase64(subscription.getKey("auth")!),
      },
    };

    return subscriptionData;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return false;
  }
}

// Show a local notification (for testing or fallback)
export async function showLocalNotification(
  payload: NotificationPayload
): Promise<void> {
  if (getPermissionStatus() !== "granted") {
    throw new Error("Notification permission not granted");
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/badge-72.png",
    tag: payload.tag,
    data: payload.data,
    requireInteraction: payload.requireInteraction,
    silent: payload.silent,
  } as NotificationOptions);
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Notification channel types
export type NotificationChannel =
  | "assignments"
  | "grades"
  | "announcements"
  | "clinical"
  | "discussions"
  | "reminders";

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationChannel, {
  email: boolean;
  push: boolean;
  inApp: boolean;
}> = {
  assignments: { email: true, push: true, inApp: true },
  grades: { email: true, push: true, inApp: true },
  announcements: { email: true, push: false, inApp: true },
  clinical: { email: true, push: true, inApp: true },
  discussions: { email: false, push: false, inApp: true },
  reminders: { email: true, push: true, inApp: true },
};

// Notification preference descriptions
export const NOTIFICATION_CHANNEL_INFO: Record<NotificationChannel, {
  label: string;
  description: string;
}> = {
  assignments: {
    label: "Assignments",
    description: "New assignments, due date reminders, and submission confirmations",
  },
  grades: {
    label: "Grades",
    description: "Grade postings and feedback on your submissions",
  },
  announcements: {
    label: "Announcements",
    description: "Course announcements from your instructors",
  },
  clinical: {
    label: "Clinical",
    description: "Shift bookings, reminders, and verification updates",
  },
  discussions: {
    label: "Discussions",
    description: "Replies to your posts and mentions",
  },
  reminders: {
    label: "Reminders",
    description: "Upcoming deadlines and scheduled events",
  },
};

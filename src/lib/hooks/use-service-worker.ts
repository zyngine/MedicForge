"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
    error: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isSupported: true,
      isOnline: navigator.onLine,
    }));

    // Register the service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[App] Service worker registered:", registration.scope);

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content is available, prompt user to refresh
                console.log("[App] New content available, please refresh");
              }
            });
          }
        });
      } catch (error) {
        console.error("[App] Service worker registration failed:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error("Registration failed"),
        }));
      }
    };

    registerSW();

    // Handle online/offline events
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      return "unsupported";
    }

    const permission = await Notification.requestPermission();
    return permission;
  };

  // Subscribe to push notifications
  const subscribeToPush = async (vapidPublicKey: string) => {
    if (!state.registration) {
      throw new Error("Service worker not registered");
    }

    try {
      const subscription = await state.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      return subscription;
    } catch (error) {
      console.error("[App] Push subscription failed:", error);
      throw error;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    if (!state.registration) {
      return false;
    }

    try {
      const subscription = await state.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error("[App] Push unsubscription failed:", error);
      return false;
    }
  };

  // Trigger background sync
  const triggerSync = async (tag: string) => {
    if (!state.registration) {
      throw new Error("Service worker not registered");
    }

    if ("sync" in state.registration) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (state.registration as any).sync.register(tag);
    }
  };

  // Skip waiting and activate new service worker
  const skipWaiting = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return {
    ...state,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    triggerSync,
    skipWaiting,
  };
}

// Helper to convert VAPID key
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

// Hook for checking online status only
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from "react";

export interface OfflineStatus {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  pendingSync: {
    submissions: number;
    clinicalLogs: number;
    skillAttempts: number;
    patientContacts: number;
    total: number;
  };
}

export interface UseOfflineReturn {
  status: OfflineStatus;
  cacheData: (key: string, data: unknown) => Promise<void>;
  getCachedData: <T>(key: string) => Promise<T | null>;
  queueForSync: (store: string, data: unknown) => Promise<void>;
  forceSync: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

// Send message to service worker and wait for response
function sendSWMessage<T>(message: { type: string; payload?: unknown }): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error("Service worker not ready"));
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data as T);
    };

    navigator.serviceWorker.controller.postMessage(message, [channel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error("Service worker timeout")), 5000);
  });
}

export function useOffline(): UseOfflineReturn {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isServiceWorkerReady: false,
    pendingSync: {
      submissions: 0,
      clinicalLogs: 0,
      skillAttempts: 0,
      patientContacts: 0,
      total: 0,
    },
  });

  // Check service worker status
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const checkSW = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        setStatus((prev) => ({
          ...prev,
          isServiceWorkerReady: !!registration.active,
        }));
      } catch {
        setStatus((prev) => ({
          ...prev,
          isServiceWorkerReady: false,
        }));
      }
    };

    checkSW();
  }, []);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          if ("sync" in registration) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (registration as any).sync.register("sync-all-pending");
          }
        });
      }
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh pending sync count
  const refreshPendingCount = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      const result = await sendSWMessage<{ type: string; count: OfflineStatus["pendingSync"] }>({
        type: "GET_PENDING_COUNT",
      });

      if (result?.count) {
        setStatus((prev) => ({
          ...prev,
          pendingSync: result.count,
        }));
      }
    } catch (err) {
      console.error("Failed to get pending count:", err);
    }
  }, []);

  // Cache data for offline access
  const cacheData = useCallback(async (key: string, data: unknown): Promise<void> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      // Fallback to localStorage
      try {
        localStorage.setItem(`medicforge-offline-${key}`, JSON.stringify(data));
      } catch {
        console.error("Failed to cache data in localStorage");
      }
      return;
    }

    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_DATA",
          payload: { key, data },
        });
      }
    } catch (err) {
      console.error("Failed to cache data:", err);
      // Fallback to localStorage
      try {
        localStorage.setItem(`medicforge-offline-${key}`, JSON.stringify(data));
      } catch {
        console.error("Failed to cache data in localStorage");
      }
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    if (typeof window === "undefined") {
      return null;
    }

    // Try service worker first
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      try {
        const result = await sendSWMessage<{ type: string; data: T }>({
          type: "GET_CACHED_DATA",
          payload: { key },
        });

        if (result?.data) {
          return result.data;
        }
      } catch {
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`medicforge-offline-${key}`);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch {
      console.error("Failed to get cached data from localStorage");
    }

    return null;
  }, []);

  // Queue data for sync when online
  const queueForSync = useCallback(async (store: string, data: unknown): Promise<void> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      // Fallback: store in localStorage queue
      try {
        const queueKey = `medicforge-queue-${store}`;
        const existingQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
        existingQueue.push({ data, timestamp: Date.now() });
        localStorage.setItem(queueKey, JSON.stringify(existingQueue));
      } catch {
        console.error("Failed to queue for sync in localStorage");
      }
      return;
    }

    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "QUEUE_SYNC",
          payload: { store, data },
        });
        await refreshPendingCount();
      }
    } catch (err) {
      console.error("Failed to queue for sync:", err);
    }
  }, [refreshPendingCount]);

  // Force sync all pending data
  const forceSync = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).sync.register("sync-submissions"),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).sync.register("sync-clinical-logs"),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).sync.register("sync-pending-skill-attempts"),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).sync.register("sync-pending-patient-contacts"),
        ]);
      }
      await refreshPendingCount();
    } catch (err) {
      console.error("Failed to force sync:", err);
    }
  }, [refreshPendingCount]);

  // Refresh pending count periodically
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return {
    status,
    cacheData,
    getCachedData,
    queueForSync,
    forceSync,
    refreshPendingCount,
  };
}

// Hook for registering and managing service worker
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        setRegistration(reg);

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for waiting worker on load
        if (reg.waiting) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error("Failed to register service worker:", err);
      }
    };

    registerSW();
  }, []);

  const update = useCallback(async () => {
    if (!registration?.waiting) return;

    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload the page after the new service worker takes control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [registration]);

  return {
    registration,
    updateAvailable,
    update,
  };
}

// Hook for install prompt (Add to Home Screen)
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);

    return result.outcome === "accepted";
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  };
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

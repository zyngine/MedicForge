"use client";

import * as React from "react";
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface AutoSaveProps {
  /** Data to save */
  data: unknown;
  /** Save function that returns a promise */
  onSave: (data: unknown) => Promise<void>;
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Show status indicator */
  showStatus?: boolean;
  /** Callback when save status changes */
  onStatusChange?: (status: SaveStatus) => void;
  className?: string;
}

export function AutoSave({
  data,
  onSave,
  debounceMs = 2000,
  showStatus = true,
  onStatusChange,
  className,
}: AutoSaveProps) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const previousDataRef = React.useRef<string>("");
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update status and notify
  const updateStatus = React.useCallback(
    (newStatus: SaveStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // Check online status
  React.useEffect(() => {
    const handleOnline = () => {
      if (status === "offline") {
        updateStatus("idle");
      }
    };

    const handleOffline = () => {
      updateStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) {
      updateStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [status, updateStatus]);

  // Auto-save logic
  React.useEffect(() => {
    const dataString = JSON.stringify(data);

    // Skip if data hasn't changed
    if (dataString === previousDataRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip if offline
    if (!navigator.onLine) {
      updateStatus("offline");
      return;
    }

    // Set debounced save
    timeoutRef.current = setTimeout(async () => {
      updateStatus("saving");

      try {
        await onSave(data);
        previousDataRef.current = dataString;
        setLastSaved(new Date());
        updateStatus("saved");

        // Reset to idle after 2 seconds
        setTimeout(() => {
          updateStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Auto-save failed:", error);
        updateStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, debounceMs, updateStatus]);

  if (!showStatus) {
    return null;
  }

  return (
    <AutoSaveIndicator
      status={status}
      lastSaved={lastSaved}
      className={className}
    />
  );
}

// Status indicator component
export function AutoSaveIndicator({
  status,
  lastSaved,
  className,
}: {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}) {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Saving...",
          color: "text-muted-foreground",
        };
      case "saved":
        return {
          icon: <Check className="h-4 w-4" />,
          text: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : "Saved",
          color: "text-green-600 dark:text-green-400",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Save failed",
          color: "text-red-600 dark:text-red-400",
        };
      case "offline":
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: "Offline - changes saved locally",
          color: "text-yellow-600 dark:text-yellow-400",
        };
      default:
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: lastSaved ? `Last saved ${formatLastSaved(lastSaved)}` : "Auto-save enabled",
          color: "text-muted-foreground",
        };
    }
  };

  const { icon, text, color } = getStatusDisplay();

  return (
    <div className={cn("flex items-center gap-1.5 text-sm", color, className)}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

// Hook for managing auto-save state
export function useAutoSave<T>(
  saveFunction: (data: T) => Promise<void>,
  options?: {
    debounceMs?: number;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
  }
) {
  const { debounceMs = 2000, onError, onSuccess } = options || {};
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [pendingData, setPendingData] = React.useState<T | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const save = React.useCallback(
    async (data: T, immediate = false) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!navigator.onLine) {
        setStatus("offline");
        setPendingData(data);
        return;
      }

      const performSave = async () => {
        setStatus("saving");
        try {
          await saveFunction(data);
          setLastSaved(new Date());
          setStatus("saved");
          onSuccess?.();

          setTimeout(() => {
            setStatus("idle");
          }, 2000);
        } catch (error) {
          setStatus("error");
          onError?.(error as Error);
        }
      };

      if (immediate) {
        await performSave();
      } else {
        timeoutRef.current = setTimeout(performSave, debounceMs);
      }
    },
    [saveFunction, debounceMs, onError, onSuccess]
  );

  // Save pending data when coming back online
  React.useEffect(() => {
    const handleOnline = () => {
      if (pendingData) {
        save(pendingData, true);
        setPendingData(null);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pendingData, save]);

  const forceSave = React.useCallback(
    (data: T) => save(data, true),
    [save]
  );

  return {
    status,
    lastSaved,
    save,
    forceSave,
    isOffline: status === "offline",
    isSaving: status === "saving",
    hasError: status === "error",
  };
}

// Local storage backup for offline support
export function useLocalBackup<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const [hasLocalBackup, setHasLocalBackup] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(key);
      setHasLocalBackup(!!stored);
    } catch {
      setHasLocalBackup(false);
    }
  }, [key]);

  const updateValue = React.useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const updated = typeof newValue === "function"
          ? (newValue as (prev: T) => T)(prev)
          : newValue;

        try {
          localStorage.setItem(key, JSON.stringify(updated));
          setHasLocalBackup(true);
        } catch (error) {
          console.error("Failed to save to local storage:", error);
        }

        return updated;
      });
    },
    [key]
  );

  const clearBackup = React.useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasLocalBackup(false);
    } catch (error) {
      console.error("Failed to clear local storage:", error);
    }
  }, [key]);

  return {
    value,
    setValue: updateValue,
    hasLocalBackup,
    clearBackup,
  };
}

"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface LockdownViolation {
  type: "tab_switch" | "window_blur" | "copy_attempt" | "paste_attempt" | "screenshot_attempt" | "devtools" | "right_click" | "key_shortcut";
  timestamp: string;
  details?: string;
}

export interface LockdownConfig {
  enabled: boolean;
  allowCopy: boolean;
  allowPaste: boolean;
  allowRightClick: boolean;
  allowDevTools: boolean;
  allowTabSwitch: boolean;
  maxViolations: number;
  warningThreshold: number;
  fullscreenRequired: boolean;
  webcamProctor: boolean;
}

export interface LockdownStatus {
  isActive: boolean;
  isFullscreen: boolean;
  violations: LockdownViolation[];
  violationCount: number;
  warningCount: number;
  isTerminated: boolean;
}

const DEFAULT_CONFIG: LockdownConfig = {
  enabled: true,
  allowCopy: false,
  allowPaste: false,
  allowRightClick: false,
  allowDevTools: false,
  allowTabSwitch: false,
  maxViolations: 5,
  warningThreshold: 3,
  fullscreenRequired: true,
  webcamProctor: false,
};

export function useLockdownBrowser(config: Partial<LockdownConfig> = {}) {
  const [status, setStatus] = useState<LockdownStatus>({
    isActive: false,
    isFullscreen: false,
    violations: [],
    violationCount: 0,
    warningCount: 0,
    isTerminated: false,
  });

  const lockdownConfig = { ...DEFAULT_CONFIG, ...config };
  const onViolationCallback = useRef<((violation: LockdownViolation) => void) | null>(null);
  const onTerminationCallback = useRef<(() => void) | null>(null);

  // Record a violation
  const recordViolation = useCallback((
    type: LockdownViolation["type"],
    details?: string
  ) => {
    const violation: LockdownViolation = {
      type,
      timestamp: new Date().toISOString(),
      details,
    };

    setStatus((prev) => {
      const newViolations = [...prev.violations, violation];
      const newViolationCount = prev.violationCount + 1;
      const shouldTerminate = newViolationCount >= lockdownConfig.maxViolations;

      if (newViolationCount === lockdownConfig.warningThreshold) {
        toast.warning(
          `Warning: ${lockdownConfig.maxViolations - newViolationCount} violations remaining before test termination`
        );
      }

      if (shouldTerminate && onTerminationCallback.current) {
        onTerminationCallback.current();
      }

      if (onViolationCallback.current) {
        onViolationCallback.current(violation);
      }

      return {
        ...prev,
        violations: newViolations,
        violationCount: newViolationCount,
        warningCount: newViolationCount >= lockdownConfig.warningThreshold ? prev.warningCount + 1 : prev.warningCount,
        isTerminated: shouldTerminate,
      };
    });

    toast.error(`Violation recorded: ${type.replace("_", " ")}`);
  }, [lockdownConfig]);

  // Activate lockdown
  const activate = useCallback(async (): Promise<boolean> => {
    if (!lockdownConfig.enabled) {
      setStatus((prev) => ({ ...prev, isActive: true }));
      return true;
    }

    try {
      // Request fullscreen if required
      if (lockdownConfig.fullscreenRequired) {
        try {
          await document.documentElement.requestFullscreen();
          setStatus((prev) => ({ ...prev, isFullscreen: true }));
        } catch (_err) {
          toast.error("Fullscreen mode is required for this exam");
          return false;
        }
      }

      setStatus((prev) => ({
        ...prev,
        isActive: true,
        violations: [],
        violationCount: 0,
        warningCount: 0,
        isTerminated: false,
      }));

      toast.success("Lockdown browser activated");
      return true;
    } catch (_err) {
      toast.error("Failed to activate lockdown mode");
      return false;
    }
  }, [lockdownConfig]);

  // Deactivate lockdown
  const deactivate = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isActive: false,
      isFullscreen: false,
    }));

    // Exit fullscreen if in fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Set callbacks
  const onViolation = useCallback((callback: (violation: LockdownViolation) => void) => {
    onViolationCallback.current = callback;
  }, []);

  const onTermination = useCallback((callback: () => void) => {
    onTerminationCallback.current = callback;
  }, []);

  // Event handlers
  useEffect(() => {
    if (!status.isActive || !lockdownConfig.enabled) return;

    // Tab/window visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && !lockdownConfig.allowTabSwitch) {
        recordViolation("tab_switch", "Tab switched during exam");
      }
    };

    // Window blur (switching to another window)
    const handleBlur = () => {
      if (!lockdownConfig.allowTabSwitch) {
        recordViolation("window_blur", "Window lost focus");
      }
    };

    // Copy attempt
    const handleCopy = (e: ClipboardEvent) => {
      if (!lockdownConfig.allowCopy) {
        e.preventDefault();
        recordViolation("copy_attempt", "Copy attempt blocked");
      }
    };

    // Paste attempt
    const handlePaste = (e: ClipboardEvent) => {
      if (!lockdownConfig.allowPaste) {
        e.preventDefault();
        recordViolation("paste_attempt", "Paste attempt blocked");
      }
    };

    // Right click
    const handleContextMenu = (e: MouseEvent) => {
      if (!lockdownConfig.allowRightClick) {
        e.preventDefault();
        recordViolation("right_click", "Right-click blocked");
      }
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      const blockedShortcuts = [
        { ctrl: true, key: "c" }, // Copy
        { ctrl: true, key: "v" }, // Paste
        { ctrl: true, key: "a" }, // Select all
        { ctrl: true, key: "p" }, // Print
        { ctrl: true, key: "s" }, // Save
        { ctrl: true, shift: true, key: "i" }, // DevTools
        { ctrl: true, shift: true, key: "j" }, // DevTools
        { key: "F12" }, // DevTools
        { key: "PrintScreen" }, // Screenshot
        { alt: true, key: "Tab" }, // Alt-Tab
        { meta: true, key: "Tab" }, // Cmd-Tab (Mac)
      ];

      for (const shortcut of blockedShortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : true;
        const metaMatch = shortcut.meta ? e.metaKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key?.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          e.preventDefault();

          if (shortcut.key === "c" && !lockdownConfig.allowCopy) {
            recordViolation("copy_attempt", "Keyboard copy blocked");
          } else if (shortcut.key === "v" && !lockdownConfig.allowPaste) {
            recordViolation("paste_attempt", "Keyboard paste blocked");
          } else if ((shortcut.key === "i" || shortcut.key === "j" || shortcut.key === "F12") && !lockdownConfig.allowDevTools) {
            recordViolation("devtools", "DevTools shortcut blocked");
          } else if (shortcut.key === "PrintScreen") {
            recordViolation("screenshot_attempt", "Screenshot blocked");
          } else {
            recordViolation("key_shortcut", `Blocked: ${e.key}`);
          }
          return;
        }
      }
    };

    // Fullscreen change
    const handleFullscreenChange = () => {
      if (lockdownConfig.fullscreenRequired && !document.fullscreenElement) {
        setStatus((prev) => ({ ...prev, isFullscreen: false }));
        recordViolation("tab_switch", "Exited fullscreen mode");

        // Re-request fullscreen
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 1000);
      }
    };

    // DevTools detection (resize-based heuristic)
    let windowOuterWidth = window.outerWidth;
    let windowOuterHeight = window.outerHeight;

    const handleResize = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      // DevTools typically adds 200+ pixels when docked
      if (!lockdownConfig.allowDevTools && (widthDiff > 200 || heightDiff > 200)) {
        // Only record if size changed significantly
        if (Math.abs(windowOuterWidth - window.outerWidth) > 100 ||
            Math.abs(windowOuterHeight - window.outerHeight) > 100) {
          recordViolation("devtools", "Possible DevTools detected");
        }
      }

      windowOuterWidth = window.outerWidth;
      windowOuterHeight = window.outerHeight;
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);

    // Disable text selection via CSS
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleResize);

      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [status.isActive, lockdownConfig, recordViolation]);

  return {
    status,
    config: lockdownConfig,
    activate,
    deactivate,
    recordViolation,
    onViolation,
    onTermination,
  };
}

// Component for lockdown browser warning banner
export function LockdownBrowserBanner({
  violations,
  maxViolations,
  isActive,
}: {
  violations: number;
  maxViolations: number;
  isActive: boolean;
}) {
  if (!isActive) return null;

  const remaining = maxViolations - violations;
  const severity = remaining <= 1 ? "critical" : remaining <= 2 ? "warning" : "info";

  return (
    <div
      className={`fixed top-0 left-0 right-0 py-2 px-4 text-center text-sm font-medium z-50 ${
        severity === "critical"
          ? "bg-red-600 text-white"
          : severity === "warning"
          ? "bg-yellow-500 text-black"
          : "bg-blue-600 text-white"
      }`}
    >
      {severity === "critical" ? (
        <>
          <strong>FINAL WARNING:</strong> {remaining} violation(s) remaining before test termination
        </>
      ) : severity === "warning" ? (
        <>
          <strong>Warning:</strong> {remaining} violation(s) remaining
        </>
      ) : (
        <>
          Secure exam mode active • {remaining} violations allowed
        </>
      )}
    </div>
  );
}

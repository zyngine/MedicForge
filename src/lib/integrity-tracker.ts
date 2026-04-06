"use client";

/**
 * IntegrityTracker - Client-side academic integrity monitoring
 *
 * Tracks suspicious behavior during exams:
 * - Window blur/focus (tab switching)
 * - Copy/paste/cut attempts
 * - Right-click context menu
 * - Keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
 * - Developer tools detection
 * - Text selection
 *
 * Events are batched and sent to the server periodically.
 */

export type IntegrityEventType =
  | "blur"
  | "focus"
  | "copy"
  | "paste"
  | "cut"
  | "right_click"
  | "print"
  | "screenshot"
  | "shortcut"
  | "selection"
  | "resize"
  | "devtools"
  | "tab_hidden"
  | "tab_visible";

export interface IntegrityEvent {
  event_type: IntegrityEventType;
  event_data: Record<string, any>;
  question_id?: string;
  question_number?: number;
  timestamp: string;
}

export interface IntegrityTrackerConfig {
  attemptId: string;
  tenantId: string;
  userId: string;
  onEvent?: (event: IntegrityEvent) => void;
  onWarning?: (message: string) => void;
  preventCopyPaste?: boolean;
  blockRightClick?: boolean;
  warnOnBlur?: boolean;
  flushIntervalMs?: number;
}

type EventHandler = (e: Event) => void;

export class IntegrityTracker {
  private config: IntegrityTrackerConfig;
  private events: IntegrityEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private currentQuestionId: string | null = null;
  private currentQuestionNumber: number | null = null;
  private isDestroyed = false;
  private devtoolsOpen = false;

  // Store bound handlers for cleanup
  private handlers: Map<string, EventHandler> = new Map();

  constructor(config: IntegrityTrackerConfig) {
    this.config = {
      flushIntervalMs: 30000, // 30 seconds default
      preventCopyPaste: false,
      blockRightClick: false,
      warnOnBlur: true,
      ...config,
    };
  }

  /**
   * Initialize the tracker and start monitoring
   */
  init(): void {
    if (typeof window === "undefined") return;

    // Window focus/blur
    this.addHandler("blur", window, this.onBlur.bind(this));
    this.addHandler("focus", window, this.onFocus.bind(this));

    // Document visibility
    this.addHandler("visibilitychange", document, this.onVisibilityChange.bind(this));

    // Copy/paste/cut
    this.addHandler("copy", document, this.onCopy.bind(this));
    this.addHandler("paste", document, this.onPaste.bind(this));
    this.addHandler("cut", document, this.onCut.bind(this));

    // Context menu (right-click)
    this.addHandler("contextmenu", document, this.onContextMenu.bind(this));

    // Keyboard shortcuts
    this.addHandler("keydown", document, this.onKeydown.bind(this));

    // Text selection
    this.addHandler("selectstart", document, this.onSelect.bind(this));

    // Print attempts
    this.addHandler("beforeprint", window, this.onPrint.bind(this));

    // Window resize (potential screen recording indicator)
    this.addHandler("resize", window, this.onResize.bind(this));

    // Start devtools detection
    this.startDevtoolsDetection();

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    console.log("[IntegrityTracker] Initialized");
  }

  /**
   * Set the current question being viewed
   */
  setCurrentQuestion(questionId: string | null, questionNumber: number | null): void {
    this.currentQuestionId = questionId;
    this.currentQuestionNumber = questionNumber;
  }

  /**
   * Add an event handler and store reference for cleanup
   */
  private addHandler(
    eventName: string,
    target: Window | Document,
    handler: EventHandler
  ): void {
    const key = `${eventName}-${target === window ? "window" : "document"}`;
    this.handlers.set(key, handler);
    target.addEventListener(eventName, handler);
  }

  /**
   * Record an integrity event
   */
  private recordEvent(
    eventType: IntegrityEventType,
    eventData: Record<string, any> = {},
    _preventDefault = false
  ): void {
    if (this.isDestroyed) return;

    const event: IntegrityEvent = {
      event_type: eventType,
      event_data: eventData,
      question_id: this.currentQuestionId || undefined,
      question_number: this.currentQuestionNumber || undefined,
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    this.config.onEvent?.(event);

    // Immediate warning for high-suspicion events
    if (this.config.warnOnBlur && eventType === "blur") {
      this.config.onWarning?.("Leaving the exam window has been recorded.");
    }

    if (eventType === "devtools") {
      this.config.onWarning?.("Developer tools detected. This has been recorded.");
    }
  }

  // ========== Event Handlers ==========

  private onBlur(): void {
    this.recordEvent("blur");
  }

  private onFocus(): void {
    this.recordEvent("focus");
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.recordEvent("tab_hidden");
    } else {
      this.recordEvent("tab_visible");
    }
  }

  private onCopy(e: Event): void {
    this.recordEvent("copy", { selection: window.getSelection()?.toString()?.slice(0, 100) });

    if (this.config.preventCopyPaste) {
      e.preventDefault();
      this.config.onWarning?.("Copy is disabled during this exam.");
    }
  }

  private onPaste(e: Event): void {
    this.recordEvent("paste");

    if (this.config.preventCopyPaste) {
      e.preventDefault();
      this.config.onWarning?.("Paste is disabled during this exam.");
    }
  }

  private onCut(e: Event): void {
    this.recordEvent("cut");

    if (this.config.preventCopyPaste) {
      e.preventDefault();
      this.config.onWarning?.("Cut is disabled during this exam.");
    }
  }

  private onContextMenu(e: Event): void {
    this.recordEvent("right_click");

    if (this.config.blockRightClick) {
      e.preventDefault();
      this.config.onWarning?.("Right-click is disabled during this exam.");
    }
  }

  private onKeydown(e: Event): void {
    const keyEvent = e as KeyboardEvent;
    const key = keyEvent.key.toLowerCase();
    const ctrl = keyEvent.ctrlKey || keyEvent.metaKey;

    // Detect suspicious keyboard shortcuts
    if (ctrl) {
      const suspiciousKeys = ["c", "v", "x", "a", "p", "s", "u", "shift", "i", "j"];
      if (suspiciousKeys.includes(key)) {
        this.recordEvent("shortcut", {
          key,
          ctrl: keyEvent.ctrlKey,
          meta: keyEvent.metaKey,
          shift: keyEvent.shiftKey,
          alt: keyEvent.altKey,
        });

        // Ctrl+Shift+I or Ctrl+Shift+J (DevTools)
        if (keyEvent.shiftKey && (key === "i" || key === "j")) {
          this.recordEvent("devtools", { trigger: "keyboard_shortcut" });
        }

        // Prevent copy/paste shortcuts if configured
        if (this.config.preventCopyPaste && ["c", "v", "x"].includes(key)) {
          e.preventDefault();
        }

        // Prevent print
        if (key === "p") {
          e.preventDefault();
          this.recordEvent("print", { trigger: "keyboard_shortcut" });
          this.config.onWarning?.("Printing is disabled during this exam.");
        }
      }
    }

    // F12 key (DevTools)
    if (keyEvent.key === "F12") {
      e.preventDefault();
      this.recordEvent("devtools", { trigger: "f12" });
    }

    // Print Screen
    if (keyEvent.key === "PrintScreen") {
      this.recordEvent("screenshot");
    }
  }

  private onSelect(): void {
    // Only record if there's a meaningful selection
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 10) {
      this.recordEvent("selection", { length: selection.length });
    }
  }

  private onPrint(): void {
    this.recordEvent("print");
    this.config.onWarning?.("Printing is disabled during this exam.");
  }

  private onResize(): void {
    this.recordEvent("resize", {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  /**
   * Detect developer tools opening
   * Uses console timing and element inspection tricks
   */
  private startDevtoolsDetection(): void {
    const threshold = 160;

    const checkDevtools = (): void => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!this.devtoolsOpen) {
          this.devtoolsOpen = true;
          this.recordEvent("devtools", { trigger: "size_detection" });
        }
      } else {
        this.devtoolsOpen = false;
      }
    };

    // Check periodically
    const devtoolsInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(devtoolsInterval);
        return;
      }
      checkDevtools();
    }, 1000);
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.events.length === 0 || this.isDestroyed) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Send events to the server via API
      const response = await fetch("/api/integrity/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: this.config.attemptId,
          tenantId: this.config.tenantId,
          userId: this.config.userId,
          events: eventsToSend,
        }),
      });

      if (!response.ok) {
        // Put events back if failed
        this.events = [...eventsToSend, ...this.events];
        console.error("[IntegrityTracker] Failed to flush events");
      }
    } catch (error) {
      // Put events back if failed
      this.events = [...eventsToSend, ...this.events];
      console.error("[IntegrityTracker] Error flushing events:", error);
    }
  }

  /**
   * Get current event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Destroy the tracker and cleanup
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Remove all event listeners
    this.handlers.forEach((handler, key) => {
      const [eventName, targetType] = key.split("-");
      const target = targetType === "window" ? window : document;
      target.removeEventListener(eventName, handler);
    });
    this.handlers.clear();

    // Final flush
    await this.flush();

    console.log("[IntegrityTracker] Destroyed");
  }
}

/**
 * Create and initialize an integrity tracker
 */
export function createIntegrityTracker(config: IntegrityTrackerConfig): IntegrityTracker {
  const tracker = new IntegrityTracker(config);
  tracker.init();
  return tracker;
}

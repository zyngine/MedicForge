"use client";

import * as React from "react";
import { Clock, AlertTriangle, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  /** Total time allowed in seconds */
  totalSeconds: number;
  /** Callback when timer reaches zero */
  onTimeUp?: () => void;
  /** Callback with remaining time on each tick */
  onTick?: (remainingSeconds: number) => void;
  /** Whether the timer is paused */
  isPaused?: boolean;
  /** Show warning when time is low (default: 5 minutes) */
  warningThreshold?: number;
  /** Show critical warning when time is very low (default: 1 minute) */
  criticalThreshold?: number;
  /** Whether to show pause/resume controls */
  showControls?: boolean;
  /** Callback when pause state changes */
  onPauseChange?: (isPaused: boolean) => void;
  className?: string;
}

export function QuizTimer({
  totalSeconds,
  onTimeUp,
  onTick,
  isPaused = false,
  warningThreshold = 300, // 5 minutes
  criticalThreshold = 60, // 1 minute
  showControls = false,
  onPauseChange,
  className,
}: QuizTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = React.useState(totalSeconds);
  const [internalPaused, setInternalPaused] = React.useState(isPaused);

  // Sync external pause state
  React.useEffect(() => {
    setInternalPaused(isPaused);
  }, [isPaused]);

  // Timer logic
  React.useEffect(() => {
    if (internalPaused || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1;
        onTick?.(newValue);

        if (newValue <= 0) {
          onTimeUp?.();
          return 0;
        }

        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [internalPaused, remainingSeconds, onTick, onTimeUp]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerState = () => {
    if (remainingSeconds <= criticalThreshold) return "critical";
    if (remainingSeconds <= warningThreshold) return "warning";
    return "normal";
  };

  const timerState = getTimerState();

  const handleTogglePause = () => {
    const newPaused = !internalPaused;
    setInternalPaused(newPaused);
    onPauseChange?.(newPaused);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg transition-colors",
        timerState === "normal" && "bg-muted text-foreground",
        timerState === "warning" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        timerState === "critical" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse",
        className
      )}
    >
      {timerState === "critical" ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}

      <span className="font-semibold">{formatTime(remainingSeconds)}</span>

      {showControls && (
        <button
          onClick={handleTogglePause}
          className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={internalPaused ? "Resume timer" : "Pause timer"}
        >
          {internalPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

// Hook for managing quiz timer state
export function useQuizTimer(totalSeconds: number) {
  const [remainingTime, setRemainingTime] = React.useState(totalSeconds);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isTimeUp, setIsTimeUp] = React.useState(false);

  const handleTimeUp = React.useCallback(() => {
    setIsTimeUp(true);
  }, []);

  const handleTick = React.useCallback((remaining: number) => {
    setRemainingTime(remaining);
  }, []);

  const pause = React.useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = React.useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = React.useCallback(() => {
    setRemainingTime(totalSeconds);
    setIsPaused(false);
    setIsTimeUp(false);
  }, [totalSeconds]);

  return {
    remainingTime,
    isPaused,
    isTimeUp,
    pause,
    resume,
    reset,
    handleTimeUp,
    handleTick,
    setIsPaused,
  };
}

// Compact timer for header display
export function CompactQuizTimer({
  remainingSeconds,
  warningThreshold = 300,
  criticalThreshold = 60,
  className,
}: {
  remainingSeconds: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  className?: string;
}) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerState = () => {
    if (remainingSeconds <= criticalThreshold) return "critical";
    if (remainingSeconds <= warningThreshold) return "warning";
    return "normal";
  };

  const timerState = getTimerState();

  return (
    <span
      className={cn(
        "font-mono font-semibold",
        timerState === "normal" && "text-foreground",
        timerState === "warning" && "text-yellow-600 dark:text-yellow-400",
        timerState === "critical" && "text-red-600 dark:text-red-400 animate-pulse",
        className
      )}
    >
      {formatTime(remainingSeconds)}
    </span>
  );
}

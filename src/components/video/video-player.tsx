"use client";

import * as React from "react";
import NextImage from "next/image";
import { Badge, Button, Progress } from "@/components/ui";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, CheckCircle, Clock } from "lucide-react";
import {
  useUpdateVideoProgress,
  formatDuration,
  parseYouTubeId,
  parseVimeoId,
} from "@/lib/hooks/use-program-videos";

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  videoSource: string;
  title: string;
  durationSeconds: number | null;
  lastPositionSeconds?: number;
  watchPercentage?: number;
  completed?: boolean;
  virtualAttendanceGranted?: boolean;
  grantsVirtualAttendance?: boolean;
  minimumWatchPercentage?: number;
  preventSkipping?: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (percentage: number) => void;
}

export function VideoPlayer({
  videoId,
  videoUrl,
  videoSource,
  title,
  durationSeconds,
  lastPositionSeconds = 0,
  watchPercentage = 0,
  completed = false,
  virtualAttendanceGranted = false,
  grantsVirtualAttendance = true,
  minimumWatchPercentage = 90,
  preventSkipping = false,
  onComplete,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(lastPositionSeconds);
  const [duration, setDuration] = React.useState(durationSeconds || 0);
  const [watchedTime, setWatchedTime] = React.useState(0);
  const [localWatchPercentage, setLocalWatchPercentage] = React.useState(watchPercentage);
  const [isCompleted, setIsCompleted] = React.useState(completed);
  const [showCompletionMessage, setShowCompletionMessage] = React.useState(false);

  const updateProgressMutation = useUpdateVideoProgress();
  const lastSaveRef = React.useRef(0);
  const watchedSegmentsRef = React.useRef<Set<number>>(new Set());

  // Determine if this is an embedded video (YouTube/Vimeo)
  const isEmbedded = videoSource === "youtube" || videoSource === "vimeo";

  // Get embed URL
  const getEmbedUrl = () => {
    if (videoSource === "youtube") {
      const id = parseYouTubeId(videoUrl);
      if (id) {
        return `https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${window.location.origin}`;
      }
    } else if (videoSource === "vimeo") {
      const id = parseVimeoId(videoUrl);
      if (id) {
        return `https://player.vimeo.com/video/${id}?api=1`;
      }
    }
    return videoUrl;
  };

  // Save progress to backend
  const saveProgress = React.useCallback(async () => {
    if (!videoId || duration <= 0) return;

    const now = Date.now();
    // Only save every 10 seconds minimum
    if (now - lastSaveRef.current < 10000) return;
    lastSaveRef.current = now;

    try {
      const result = await updateProgressMutation.mutateAsync({
        video_id: videoId,
        watch_time_seconds: Math.floor(watchedTime),
        last_position_seconds: Math.floor(currentTime),
        duration_seconds: Math.floor(duration),
      });

      if (result.completed && !isCompleted) {
        setIsCompleted(true);
        setShowCompletionMessage(true);
        onComplete?.();
        setTimeout(() => setShowCompletionMessage(false), 5000);
      }

      setLocalWatchPercentage(result.watch_percentage);
      onProgressUpdate?.(result.watch_percentage);
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, [videoId, watchedTime, currentTime, duration, isCompleted, updateProgressMutation, onComplete, onProgressUpdate]);

  // Handle native video events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const time = video.currentTime;
    setCurrentTime(time);

    // Track watched segments (every 5 seconds)
    const segment = Math.floor(time / 5);
    if (!watchedSegmentsRef.current.has(segment)) {
      watchedSegmentsRef.current.add(segment);
      setWatchedTime((prev) => prev + 5);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);

    // Seek to last position if resuming
    if (lastPositionSeconds > 0 && videoRef.current.duration > lastPositionSeconds) {
      videoRef.current.currentTime = lastPositionSeconds;
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    saveProgress();
  };

  // Handle seeking (prevent if preventSkipping is enabled)
  const handleSeeking = () => {
    if (!videoRef.current || !preventSkipping) return;

    const video = videoRef.current;
    const maxAllowedTime = watchedTime + 5; // Allow slight buffer

    if (video.currentTime > maxAllowedTime) {
      video.currentTime = maxAllowedTime;
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  // Seek to position
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    let newTime = parseFloat(e.target.value);

    if (preventSkipping) {
      const maxAllowed = watchedTime + 5;
      newTime = Math.min(newTime, maxAllowed);
    }

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Restart video
  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.play();
  };

  // Auto-save progress periodically
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 30000); // Save every 30 seconds while playing

    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // Save on unmount
  React.useEffect(() => {
    return () => {
      if (watchedTime > 0) {
        // Fire and forget save on unmount
        updateProgressMutation.mutate({
          video_id: videoId,
          watch_time_seconds: Math.floor(watchedTime),
          last_position_seconds: Math.floor(currentTime),
          duration_seconds: Math.floor(duration),
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress percentage
  const _progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isEmbedded) {
    // For YouTube/Vimeo, use iframe embed
    return (
      <div className="space-y-4">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {localWatchPercentage}% watched
              </Badge>
            )}
            {virtualAttendanceGranted && (
              <Badge variant="info">Virtual Attendance Granted</Badge>
            )}
          </div>
          {grantsVirtualAttendance && !virtualAttendanceGranted && (
            <p className="text-xs text-muted-foreground">
              Watch {minimumWatchPercentage}% to receive virtual attendance
            </p>
          )}
        </div>

        {/* Embedded video */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={getEmbedUrl()}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        </div>

        {/* Note about progress tracking */}
        <p className="text-xs text-muted-foreground text-center">
          Note: Progress tracking for embedded videos is limited. Watch the full video to ensure completion is recorded.
        </p>

        {showCompletionMessage && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800 dark:text-green-200">Video Completed!</p>
            {grantsVirtualAttendance && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Virtual attendance has been recorded.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Native video player for uploads/direct URLs
  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {localWatchPercentage}% watched
            </Badge>
          )}
          {virtualAttendanceGranted && (
            <Badge variant="info">Virtual Attendance Granted</Badge>
          )}
        </div>
        {grantsVirtualAttendance && !virtualAttendanceGranted && (
          <p className="text-xs text-muted-foreground">
            Watch {minimumWatchPercentage}% to receive virtual attendance
          </p>
        )}
      </div>

      {/* Video container */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onSeeking={handleSeeking}
          onClick={togglePlay}
        />

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={restartVideo}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <span className="text-white text-sm">
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Play button overlay when paused */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {preventSkipping && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Watch progress required</span>
            <span>{localWatchPercentage}%</span>
          </div>
          <Progress value={localWatchPercentage} className="h-2" />
        </div>
      )}

      {showCompletionMessage && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="font-medium text-green-800 dark:text-green-200">Video Completed!</p>
          {grantsVirtualAttendance && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Virtual attendance has been recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Simple video thumbnail component
export function VideoThumbnail({
  thumbnailUrl,
  title,
  duration,
  watchPercentage = 0,
  completed = false,
}: {
  thumbnailUrl?: string | null;
  title: string;
  duration?: number | null;
  watchPercentage?: number;
  completed?: boolean;
}) {
  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
      {thumbnailUrl ? (
        <NextImage
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Play overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <Play className="h-6 w-6 text-white ml-0.5" />
        </div>
      </div>

      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(duration)}
        </div>
      )}

      {/* Progress bar */}
      {watchPercentage > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className={`h-full ${completed ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${watchPercentage}%` }}
          />
        </div>
      )}

      {/* Completed badge */}
      {completed && (
        <div className="absolute top-2 right-2">
          <Badge variant="success" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        </div>
      )}
    </div>
  );
}

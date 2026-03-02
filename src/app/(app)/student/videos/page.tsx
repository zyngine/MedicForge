"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  Video,
  Play,
  CheckCircle,
  Clock,
  Award,
  Filter,
} from "lucide-react";
import {
  useStudentVideos,
  formatDuration,
  getVideoSourceLabel,
  type StudentVideo,
} from "@/lib/hooks/use-program-videos";
import { VideoThumbnail } from "@/components/video/video-player";

export default function StudentVideosPage() {
  const { data: videos = [], isLoading } = useStudentVideos();
  const [filter, setFilter] = React.useState<"all" | "in_progress" | "completed">("all");

  // Filter videos
  const filteredVideos = React.useMemo(() => {
    switch (filter) {
      case "in_progress":
        return videos.filter((v) => v.watch_percentage > 0 && !v.completed);
      case "completed":
        return videos.filter((v) => v.completed);
      default:
        return videos;
    }
  }, [videos, filter]);

  // Stats
  const stats = React.useMemo(() => {
    const total = videos.length;
    const completed = videos.filter((v) => v.completed).length;
    const inProgress = videos.filter((v) => v.watch_percentage > 0 && !v.completed).length;
    const virtualAttendanceEarned = videos.filter((v) => v.virtual_attendance_granted).length;
    return { total, completed, inProgress, virtualAttendanceEarned };
  }, [videos]);

  // Group by program
  const videosByProgram = React.useMemo(() => {
    const grouped = new Map<string, StudentVideo[]>();
    filteredVideos.forEach((video) => {
      const programName = video.program_name || "General";
      if (!grouped.has(programName)) {
        grouped.set(programName, []);
      }
      grouped.get(programName)!.push(video);
    });
    return grouped;
  }, [filteredVideos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Video Library</h1>
        <p className="text-muted-foreground">
          Watch program videos and earn virtual attendance
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.virtualAttendanceEarned}</p>
                <p className="text-xs text-muted-foreground">Virtual Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Videos
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === "in_progress"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === "completed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Videos */}
      {filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {filter === "all" ? "No Videos Available" : `No ${filter === "in_progress" ? "In Progress" : "Completed"} Videos`}
            </h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Videos will appear here when your instructor adds them."
                : filter === "in_progress"
                ? "Start watching a video to see it here."
                : "Complete watching a video to see it here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(videosByProgram.entries()).map(([programName, programVideos]) => (
            <div key={programName}>
              <h2 className="text-lg font-semibold mb-4">{programName}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programVideos.map((video) => (
                  <Link key={video.id} href={`/student/videos/${video.id}`}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                      <VideoThumbnail
                        thumbnailUrl={video.thumbnail_url}
                        title={video.title}
                        duration={video.duration_seconds}
                        watchPercentage={video.watch_percentage}
                        completed={video.completed}
                      />
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1 line-clamp-1">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {video.description}
                          </p>
                        )}

                        {/* Progress */}
                        {video.watch_percentage > 0 && !video.completed && (
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{video.watch_percentage}%</span>
                            </div>
                            <Progress value={video.watch_percentage} className="h-1.5" />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {video.completed ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : video.watch_percentage > 0 ? (
                            <Badge variant="warning" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Play className="h-3 w-3 mr-1" />
                              Not Started
                            </Badge>
                          )}

                          {video.virtual_attendance_granted && (
                            <Badge variant="info" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              VA Earned
                            </Badge>
                          )}

                          {video.grants_virtual_attendance && !video.virtual_attendance_granted && (
                            <Badge variant="secondary" className="text-xs">
                              VA Available
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

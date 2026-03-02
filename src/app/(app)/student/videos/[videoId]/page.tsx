"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  ArrowLeft,
  Video,
  Clock,
  Award,
  CheckCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import {
  useStudentVideo,
  formatDuration,
  getVideoSourceLabel,
} from "@/lib/hooks/use-program-videos";
import { VideoPlayer } from "@/components/video/video-player";
import { format } from "date-fns";

export default function StudentVideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const { data: video, isLoading, error } = useStudentVideo(videoId);
  const [localProgress, setLocalProgress] = React.useState(0);

  // Update local progress from video data
  React.useEffect(() => {
    if (video) {
      setLocalProgress(video.watch_percentage);
    }
  }, [video]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="space-y-6">
        <Link href="/student/videos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
        </Link>
        <Alert variant="error">
          <p>Video not found or you don&apos;t have access to it.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/student/videos">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Videos
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main video area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 pb-0">
                <VideoPlayer
                  videoId={video.id}
                  videoUrl={video.video_url}
                  videoSource={video.video_source}
                  title={video.title}
                  durationSeconds={video.duration_seconds}
                  lastPositionSeconds={video.last_position_seconds}
                  watchPercentage={video.watch_percentage}
                  completed={video.completed}
                  virtualAttendanceGranted={video.virtual_attendance_granted}
                  grantsVirtualAttendance={video.grants_virtual_attendance}
                  minimumWatchPercentage={video.minimum_watch_percentage}
                  onProgressUpdate={setLocalProgress}
                />
              </div>
            </CardContent>
          </Card>

          {/* Video info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{video.title}</CardTitle>
                  {video.program_name && (
                    <CardDescription>{video.program_name}</CardDescription>
                  )}
                </div>
                <Badge variant="outline">{getVideoSourceLabel(video.video_source)}</Badge>
              </div>
            </CardHeader>
            {video.description && (
              <CardContent>
                <p className="text-muted-foreground">{video.description}</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Watch Progress</span>
                  <span className="font-medium">{localProgress}%</span>
                </div>
                <Progress value={localProgress} className="h-2" />
              </div>

              {video.duration_seconds && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {formatDuration(video.duration_seconds)}</span>
                </div>
              )}

              {video.completed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Completed</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Watch at least {video.minimum_watch_percentage}% to complete
                </div>
              )}
            </CardContent>
          </Card>

          {/* Virtual attendance card */}
          {video.grants_virtual_attendance && (
            <Card className={video.virtual_attendance_granted ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className={`h-5 w-5 ${video.virtual_attendance_granted ? "text-green-600" : ""}`} />
                  Virtual Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {video.virtual_attendance_granted ? (
                  <div className="space-y-2">
                    <Badge variant="success" className="w-full justify-center py-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Attendance Earned!
                    </Badge>
                    <p className="text-sm text-muted-foreground text-center">
                      Your attendance has been recorded for this session.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Complete this video to receive virtual attendance credit.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                          localProgress >= video.minimum_watch_percentage
                            ? "bg-green-500 text-white"
                            : "bg-muted"
                        }`}>
                          {localProgress >= video.minimum_watch_percentage && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </div>
                        <span className={localProgress >= video.minimum_watch_percentage ? "line-through text-muted-foreground" : ""}>
                          Watch {video.minimum_watch_percentage}% of video
                        </span>
                      </div>
                      {video.requires_coursework && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 rounded-full bg-muted" />
                          <span>Complete required coursework</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked session info */}
          {video.session_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Linked Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This video is linked to an attendance session. Completing it may grant you attendance credit if you were absent.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Coursework info */}
          {video.requires_coursework && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Required Coursework
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  You must complete the associated assignment to receive virtual attendance.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Assignment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

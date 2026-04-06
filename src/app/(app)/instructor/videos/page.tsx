"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Select,
  Spinner,
  Modal,
  Switch,
} from "@/components/ui";
import {
  Video,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { useCohorts } from "@/lib/hooks/use-cohorts";
import {
  useAllProgramVideos,
  useCreateVideo,
  useUpdateVideo,
  useDeleteVideo,
  useVideoStatistics,
  useVideoProgress,
  detectVideoSource,
  getVideoSourceLabel,
  type ProgramVideo,
  type VideoSource,
} from "@/lib/hooks/use-program-videos";
import { VideoThumbnail } from "@/components/video/video-player";
import { format } from "date-fns";

export default function InstructorVideosPage() {
  const { data: videos = [], isLoading: videosLoading } = useAllProgramVideos();
  const { cohorts = [] } = useCohorts({ active_only: true });
  const createMutation = useCreateVideo();
  const updateMutation = useUpdateVideo();
  const deleteMutation = useDeleteVideo();

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showStatsModal, setShowStatsModal] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState<ProgramVideo | null>(null);
  const [filterProgram, setFilterProgram] = React.useState<string>("");

  // Form state
  const [formData, setFormData] = React.useState({
    program_id: "",
    title: "",
    description: "",
    video_url: "",
    video_source: "external" as VideoSource,
    duration_seconds: "",
    thumbnail_url: "",
    minimum_watch_percentage: "90",
    grants_virtual_attendance: true,
    prevent_skipping: false,
  });

  const resetForm = () => {
    setFormData({
      program_id: "",
      title: "",
      description: "",
      video_url: "",
      video_source: "external",
      duration_seconds: "",
      thumbnail_url: "",
      minimum_watch_percentage: "90",
      grants_virtual_attendance: true,
      prevent_skipping: false,
    });
  };

  const handleUrlChange = (url: string) => {
    const detectedSource = detectVideoSource(url);
    setFormData({
      ...formData,
      video_url: url,
      video_source: detectedSource,
    });
  };

  const handleAddVideo = async () => {
    try {
      await createMutation.mutateAsync({
        program_id: formData.program_id,
        title: formData.title,
        description: formData.description || undefined,
        video_url: formData.video_url,
        video_source: formData.video_source,
        duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        minimum_watch_percentage: parseInt(formData.minimum_watch_percentage),
        grants_virtual_attendance: formData.grants_virtual_attendance,
        prevent_skipping: formData.prevent_skipping,
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to add video:", error);
    }
  };

  const handleEditVideo = async () => {
    if (!selectedVideo) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedVideo.id,
        title: formData.title,
        description: formData.description || undefined,
        video_url: formData.video_url,
        video_source: formData.video_source,
        duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        minimum_watch_percentage: parseInt(formData.minimum_watch_percentage),
        grants_virtual_attendance: formData.grants_virtual_attendance,
        prevent_skipping: formData.prevent_skipping,
      });
      setShowEditModal(false);
      setSelectedVideo(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update video:", error);
    }
  };

  const handleDeleteVideo = async (video: ProgramVideo) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(video.id);
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  const openEditModal = (video: ProgramVideo) => {
    setSelectedVideo(video);
    setFormData({
      program_id: video.program_id,
      title: video.title,
      description: video.description || "",
      video_url: video.video_url,
      video_source: video.video_source,
      duration_seconds: video.duration_seconds?.toString() || "",
      thumbnail_url: video.thumbnail_url || "",
      minimum_watch_percentage: video.minimum_watch_percentage.toString(),
      grants_virtual_attendance: video.grants_virtual_attendance,
      prevent_skipping: video.prevent_skipping,
    });
    setShowEditModal(true);
  };

  const openStatsModal = (video: ProgramVideo) => {
    setSelectedVideo(video);
    setShowStatsModal(true);
  };

  // Filter videos by program
  const filteredVideos = filterProgram
    ? videos.filter((v) => v.program_id === filterProgram)
    : videos;

  // Group videos by program
  const videosByProgram = React.useMemo(() => {
    const grouped = new Map<string, ProgramVideo[]>();
    filteredVideos.forEach((video) => {
      const programName = video.program?.name || "Unknown Program";
      if (!grouped.has(programName)) {
        grouped.set(programName, []);
      }
      grouped.get(programName)!.push(video);
    });
    return grouped;
  }, [filteredVideos]);

  if (videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Library</h1>
          <p className="text-muted-foreground">
            Manage program videos with progress tracking and virtual attendance
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Select
                value={filterProgram}
                onChange={setFilterProgram}
                options={[
                  { value: "", label: "All Programs" },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...cohorts.map((c: any) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredVideos.length} video{filteredVideos.length !== 1 && "s"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos */}
      {filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Videos Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add videos from YouTube, Vimeo, or upload directly
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(videosByProgram.entries()).map(([programName, programVideos]) => (
            <div key={programName}>
              <h2 className="text-lg font-semibold mb-3">{programName}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programVideos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <VideoThumbnail
                      thumbnailUrl={video.thumbnail_url}
                      title={video.title}
                      duration={video.duration_seconds}
                    />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{video.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {video.description || "No description"}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0">
                          {getVideoSourceLabel(video.video_source)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        {video.grants_virtual_attendance && (
                          <Badge variant="info" className="text-xs">
                            Virtual Attendance
                          </Badge>
                        )}
                        {video.prevent_skipping && (
                          <Badge variant="warning" className="text-xs">
                            No Skipping
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatsModal(video)}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Stats
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(video)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVideo(video)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add Video"
      >
        <VideoForm
          formData={formData}
          setFormData={setFormData}
          onUrlChange={handleUrlChange}
          cohorts={cohorts}
          onSubmit={handleAddVideo}
          onCancel={() => {
            setShowAddModal(false);
            resetForm();
          }}
          isLoading={createMutation.isPending}
          submitLabel="Add Video"
        />
      </Modal>

      {/* Edit Video Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVideo(null);
          resetForm();
        }}
        title="Edit Video"
      >
        <VideoForm
          formData={formData}
          setFormData={setFormData}
          onUrlChange={handleUrlChange}
          cohorts={cohorts}
          onSubmit={handleEditVideo}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedVideo(null);
            resetForm();
          }}
          isLoading={updateMutation.isPending}
          submitLabel="Save Changes"
          hideProgramSelect
        />
      </Modal>

      {/* Video Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setSelectedVideo(null);
        }}
        title={selectedVideo?.title || "Video Statistics"}
      >
        {selectedVideo && (
          <VideoStatsContent
            video={selectedVideo}
            onClose={() => {
              setShowStatsModal(false);
              setSelectedVideo(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// Video form component
function VideoForm({
  formData,
  setFormData,
  onUrlChange,
  cohorts,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
  hideProgramSelect = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFormData: (data: any) => void;
  onUrlChange: (url: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cohorts: any[];
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
  hideProgramSelect?: boolean;
}) {
  const isValid = formData.program_id && formData.title && formData.video_url;

  return (
    <div className="space-y-4">
      {!hideProgramSelect && (
        <div className="space-y-2">
          <Label>Program *</Label>
          <Select
            value={formData.program_id}
            onChange={(value) => setFormData({ ...formData, program_id: value })}
            options={[
              { value: "", label: "Select a program..." },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...cohorts.map((c: any) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Week 1 Lecture Recording"
        />
      </div>

      <div className="space-y-2">
        <Label>Video URL *</Label>
        <Input
          value={formData.video_url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="YouTube, Vimeo, or direct video URL"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Detected:</span>
          <Badge variant="outline">{getVideoSourceLabel(formData.video_source)}</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the video content"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            value={formData.duration_seconds}
            onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
            placeholder="e.g., 3600"
          />
        </div>
        <div className="space-y-2">
          <Label>Min. Watch %</Label>
          <Input
            type="number"
            min="1"
            max="100"
            value={formData.minimum_watch_percentage}
            onChange={(e) => setFormData({ ...formData, minimum_watch_percentage: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thumbnail URL</Label>
        <Input
          value={formData.thumbnail_url}
          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
          placeholder="Optional thumbnail image URL"
        />
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Grant Virtual Attendance</p>
            <p className="text-xs text-muted-foreground">
              Students receive attendance credit when completed
            </p>
          </div>
          <Switch
            checked={formData.grants_virtual_attendance}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, grants_virtual_attendance: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Prevent Skipping</p>
            <p className="text-xs text-muted-foreground">
              Students must watch sequentially
            </p>
          </div>
          <Switch
            checked={formData.prevent_skipping}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, prevent_skipping: checked })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!isValid} isLoading={isLoading}>
          <Video className="h-4 w-4 mr-2" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// Video stats component
function VideoStatsContent({
  video,
  onClose,
}: {
  video: ProgramVideo;
  onClose: () => void;
}) {
  const { data: stats, isLoading: statsLoading } = useVideoStatistics(video.id);
  const { data: progress = [], isLoading: progressLoading } = useVideoProgress(video.id);

  if (statsLoading || progressLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{stats?.total_viewers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Viewers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats?.completed_count || 0}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{Math.round(stats?.average_watch_percentage || 0)}%</p>
            <p className="text-xs text-muted-foreground">Avg. Watch %</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats?.virtual_attendance_count || 0}</p>
            <p className="text-xs text-muted-foreground">Virtual Attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Viewer list */}
      <div>
        <h4 className="font-medium mb-3">Viewer Progress</h4>
        {progress.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No viewers yet
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {progress.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium text-sm">{p.user?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {p.completed ? (
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline">{p.watch_percentage}%</Badge>
                    )}
                    {p.virtual_attendance_granted && (
                      <Badge variant="info" className="text-xs">VA</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(p.updated_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

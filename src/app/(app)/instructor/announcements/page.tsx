"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  Select,
  Modal,
  Alert,
  Spinner,
} from "@/components/ui";
import {
  Plus,
  Megaphone,
  Pin,
  PinOff,
  Edit,
  Trash2,
  Search,
  Clock,
  Send,
  X,
} from "lucide-react";
import {
  useInstructorAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useToggleAnnouncementPin,
  type Announcement,
} from "@/lib/hooks/use-announcements";
import { useInstructorCourses } from "@/lib/hooks/use-courses";

export default function InstructorAnnouncementsPage() {
  const { data: announcements = [], isLoading } = useInstructorAnnouncements();
  const { data: courses = [] } = useInstructorCourses();
  const { mutateAsync: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutateAsync: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutateAsync: deleteAnnouncement } = useDeleteAnnouncement();
  const { mutateAsync: togglePin } = useToggleAnnouncementPin();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    course_id: "",
    title: "",
    content: "",
    is_pinned: false,
    publish_at: "",
  });

  const resetForm = () => {
    setFormData({
      course_id: "",
      title: "",
      content: "",
      is_pinned: false,
      publish_at: "",
    });
    setEditingAnnouncement(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      course_id: announcement.course_id,
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned,
      publish_at: announcement.publish_at || "",
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingAnnouncement) {
        await updateAnnouncement({
          id: editingAnnouncement.id,
          title: formData.title,
          content: formData.content,
          is_pinned: formData.is_pinned,
          publish_at: formData.publish_at || null,
        });
      } else {
        await createAnnouncement({
          course_id: formData.course_id,
          title: formData.title,
          content: formData.content,
          is_pinned: formData.is_pinned,
          publish_at: formData.publish_at || null,
        });
      }
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save announcement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await deleteAnnouncement(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      await togglePin({ id, is_pinned: !currentPinned });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pin status");
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "all" || a.course_id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const courseOptions = [
    { value: "all", label: "All Courses" },
    ...courses.map((c) => ({ value: c.id, label: c.title })),
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Create and manage course announcements
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={courseOptions}
              value={courseFilter}
              onChange={setCourseFilter}
              className="w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first announcement to communicate with students
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {announcement.is_pinned && (
                        <Badge variant="warning" className="text-xs">
                          <Pin className="h-3 w-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {announcement.course?.title || "Course"}
                      </Badge>
                      {announcement.publish_at && new Date(announcement.publish_at) > new Date() && (
                        <Badge variant="info" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Posted {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                      {announcement.publish_at && new Date(announcement.publish_at) > new Date() && (
                        <> - Publishes {format(new Date(announcement.publish_at), "MMM d, yyyy 'at' h:mm a")}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                    >
                      {announcement.is_pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={editingAnnouncement ? "Edit Announcement" : "New Announcement"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingAnnouncement && (
            <div className="space-y-2">
              <Label required>Course</Label>
              <Select
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                value={formData.course_id}
                onChange={(val) => setFormData({ ...formData, course_id: val })}
                placeholder="Select a course"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label required>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label required>Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule (Optional)</Label>
            <Input
              type="datetime-local"
              value={formData.publish_at}
              onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to publish immediately
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_pinned"
              checked={formData.is_pinned}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              className="rounded border-muted"
            />
            <Label htmlFor="is_pinned" className="cursor-pointer">
              Pin this announcement
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              <Send className="h-4 w-4 mr-2" />
              {editingAnnouncement ? "Update" : "Publish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

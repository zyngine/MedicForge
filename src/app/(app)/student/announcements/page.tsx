"use client";

import * as React from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Avatar,
  Spinner,
} from "@/components/ui";
import {
  Megaphone,
  Pin,
  Search,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useStudentAnnouncements } from "@/lib/hooks/use-announcements";

export default function StudentAnnouncementsPage() {
  const { data: announcements = [], isLoading } = useStudentAnnouncements();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate pinned and regular announcements
  const pinnedAnnouncements = filteredAnnouncements.filter((a) => a.is_pinned);
  const regularAnnouncements = filteredAnnouncements.filter((a) => !a.is_pinned);

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
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground">
          Stay updated with news from your courses
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* No announcements */}
      {filteredAnnouncements.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No announcements</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No announcements match your search"
                : "There are no announcements from your courses yet"}
            </p>
            <Button variant="outline" asChild>
              <Link href="/student/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                View My Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pin className="h-5 w-5 text-warning" />
            Pinned
          </h2>
          {pinnedAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isExpanded={expandedIds.has(announcement.id)}
              onToggle={() => toggleExpanded(announcement.id)}
            />
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      {regularAnnouncements.length > 0 && (
        <div className="space-y-4">
          {pinnedAnnouncements.length > 0 && (
            <h2 className="text-lg font-semibold">Recent</h2>
          )}
          {regularAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isExpanded={expandedIds.has(announcement.id)}
              onToggle={() => toggleExpanded(announcement.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  isExpanded,
  onToggle,
}: {
  announcement: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    author?: { id: string; full_name: string; avatar_url: string | null };
    course?: { id: string; title: string };
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isLongContent = announcement.content.length > 300;

  return (
    <Card className={announcement.is_pinned ? "border-warning/50 bg-warning/5" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={announcement.author?.avatar_url || undefined}
            fallback={announcement.author?.full_name || "Instructor"}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{announcement.author?.full_name || "Instructor"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
              </span>
            </div>
            <Link
              href={`/student/courses/${announcement.course?.id}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-3"
            >
              <BookOpen className="h-3 w-3" />
              {announcement.course?.title || "Course"}
              <ChevronRight className="h-3 w-3" />
            </Link>

            <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p className="whitespace-pre-wrap">
                {isLongContent && !isExpanded
                  ? `${announcement.content.slice(0, 300)}...`
                  : announcement.content}
              </p>
            </div>

            {isLongContent && (
              <button
                onClick={onToggle}
                className="text-sm text-primary hover:underline mt-2"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              {format(new Date(announcement.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

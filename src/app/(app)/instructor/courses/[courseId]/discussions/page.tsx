"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Input,
} from "@/components/ui";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Search,
  Pin,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { formatDate } from "@/lib/utils";

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  reply_count: number;
  author: {
    full_name: string;
  } | null;
}

export default function CourseDiscussionsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { profile } = useUser();
  const [discussions, setDiscussions] = React.useState<Discussion[]>([]);
  const [courseName, setCourseName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const supabase = createClient();

  React.useEffect(() => {
    if (!courseId || !profile?.tenant_id) return;

    const fetchDiscussions = async () => {
      try {
        // Fetch course name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: course } = await (supabase as any)
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single();

        if (course) setCourseName(course.title);

        // Fetch discussions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("discussions")
          .select(`
            id,
            title,
            content,
            is_pinned,
            is_locked,
            created_at,
            author:users(full_name)
          `)
          .eq("course_id", courseId)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Get reply counts
        const discussionsWithCounts = await Promise.all(
          (data || []).map(async (d: Discussion) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (supabase as any)
              .from("discussion_replies")
              .select("*", { count: "exact", head: true })
              .eq("discussion_id", d.id);
            return { ...d, reply_count: count || 0 };
          })
        );

        setDiscussions(discussionsWithCounts);
      } catch (err) {
        console.error("Failed to fetch discussions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscussions();
  }, [courseId, profile?.tenant_id, supabase]);

  const filteredDiscussions = discussions.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/instructor/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Discussions</h1>
            <p className="text-muted-foreground">{courseName}</p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Discussion
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Discussions List */}
      {filteredDiscussions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a discussion to engage with students.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start First Discussion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDiscussions.map((discussion) => (
            <Card
              key={discussion.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {discussion.is_pinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                      {discussion.is_locked && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold">{discussion.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>By {discussion.author?.full_name || "Unknown"}</span>
                      <span>{formatDate(discussion.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {discussion.reply_count} replies
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
  Input,
  Spinner,
} from "@/components/ui";
import {
  MessageSquare,
  Search,
  Plus,
  Pin,
  Lock,
  MessageCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  created_at: string | null;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  course: {
    id: string;
    title: string;
  };
  _count: {
    posts: number;
  };
}

export default function DiscussionsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's enrolled courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      const courseIds = enrollments?.map((e) => e.course_id) || [];

      if (courseIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch threads from enrolled courses
      const { data: threadsData } = await supabase
        .from("discussion_threads")
        .select(`
          id,
          title,
          content,
          is_pinned,
          is_locked,
          created_at,
          author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
          course:courses!discussion_threads_course_id_fkey(id, title)
        `)
        .in("course_id", courseIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (threadsData) {
        // Get post counts for each thread
        const threadsWithCounts = await Promise.all(
          threadsData.map(async (thread) => {
            const { count } = await supabase
              .from("discussion_posts")
              .select("id", { count: "exact", head: true })
              .eq("thread_id", thread.id);

            return {
              ...thread,
              author: thread.author as unknown as Thread["author"],
              course: thread.course as unknown as Thread["course"],
              _count: { posts: count || 0 },
            };
          })
        );

        setThreads(threadsWithCounts);
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredThreads = threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.content.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div>
          <h1 className="text-3xl font-bold">Discussions</h1>
          <p className="text-muted-foreground mt-1">
            Participate in course discussions
          </p>
        </div>
        <Button asChild>
          <Link href="/student/discussions/new">
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search discussions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {filteredThreads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No discussions yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No discussions match your search"
                  : "Be the first to start a discussion!"}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/student/discussions/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Start Discussion
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredThreads.map((thread) => (
            <Link key={thread.id} href={`/student/discussions/${thread.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.is_pinned && (
                          <Pin className="h-4 w-4 text-warning" />
                        )}
                        {thread.is_locked && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold truncate">{thread.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {thread.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{thread.author?.full_name || "Unknown"}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {thread.created_at ? formatDistanceToNow(new Date(thread.created_at), { addSuffix: true }) : "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {thread._count.posts} replies
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {thread.course?.title}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

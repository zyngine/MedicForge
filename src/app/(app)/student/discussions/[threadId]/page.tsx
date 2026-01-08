"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  ArrowLeft,
  Pin,
  Lock,
  ThumbsUp,
  Send,
  MessageSquare,
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
}

interface Post {
  id: string;
  content: string;
  is_anonymous: boolean | null;
  upvotes: number | null;
  created_at: string | null;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchThread();
  }, [threadId]);

  const fetchThread = async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch thread
      const { data: threadData, error: threadError } = await supabase
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
        .eq("id", threadId)
        .single();

      if (threadError) throw threadError;
      setThread({
        ...threadData,
        author: threadData.author as unknown as Thread["author"],
        course: threadData.course as unknown as Thread["course"],
      });

      // Fetch posts
      const { data: postsData } = await supabase
        .from("discussion_posts")
        .select(`
          id,
          content,
          is_anonymous,
          upvotes,
          created_at,
          author:users!discussion_posts_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (postsData) {
        setPosts(
          postsData.map((p) => ({
            ...p,
            author: p.author as unknown as Post["author"],
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discussion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !thread) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { error: postError } = await supabase.from("discussion_posts").insert({
        tenant_id: profile.tenant_id,
        thread_id: threadId,
        content: newReply,
        author_id: user.id,
        is_anonymous: false,
      });

      if (postError) throw postError;

      setNewReply("");
      fetchThread(); // Refresh posts
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (postId: string) => {
    const supabase = createClient();

    // Simple upvote - in production, you'd track who upvoted
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const currentUpvotes = post.upvotes ?? 0;
    await supabase
      .from("discussion_posts")
      .update({ upvotes: currentUpvotes + 1 })
      .eq("id", postId);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvotes: (p.upvotes ?? 0) + 1 } : p
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!thread) {
    return <div>Discussion not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Discussions
      </Button>

      {/* Thread */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {thread.is_pinned && (
              <Badge variant="warning">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {thread.is_locked && (
              <Badge variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
            <Badge variant="outline">{thread.course?.title}</Badge>
          </div>

          <h1 className="text-2xl font-bold mb-4">{thread.title}</h1>

          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              {thread.author?.full_name?.[0] || "?"}
            </div>
            <span className="font-medium text-foreground">
              {thread.author?.full_name || "Unknown"}
            </span>
            <span>
              {thread.created_at ? formatDistanceToNow(new Date(thread.created_at), { addSuffix: true }) : "Unknown"}
            </span>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{thread.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Replies ({posts.length})
        </h2>

        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                    {post.is_anonymous ? "?" : post.author?.full_name?.[0] || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {post.is_anonymous ? "Anonymous" : post.author?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : "Unknown"}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpvote(post.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {post.upvotes}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {posts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No replies yet. Be the first!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {!thread.is_locked && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Post a Reply</h3>
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Write your reply..."
              className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleSubmitReply}
                isLoading={isSubmitting}
                disabled={!newReply.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Post Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {thread.is_locked && (
        <Alert>
          <Lock className="h-4 w-4" />
          This discussion is locked and no longer accepting replies.
        </Alert>
      )}
    </div>
  );
}

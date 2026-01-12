"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useDiscussionThread,
  useCreatePost,
  useUpvotePost,
  type PostWithAuthor,
} from "@/lib/hooks/use-discussions";

function PostItem({
  post,
  threadId,
  level = 0,
}: {
  post: PostWithAuthor;
  threadId: string;
  level?: number;
}) {
  const { mutateAsync: upvotePost, isPending: isUpvoting } = useUpvotePost();

  const handleUpvote = async () => {
    try {
      await upvotePost({ postId: post.id, threadId });
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  return (
    <div className={level > 0 ? "ml-8 border-l-2 pl-4" : ""}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
              {post.is_anonymous
                ? "?"
                : post.author?.full_name?.[0] || "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">
                  {post.is_anonymous
                    ? "Anonymous"
                    : post.author?.full_name || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {post.created_at
                    ? formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                      })
                    : "Unknown"}
                </span>
                {post.edited_at && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {post.upvotes || 0}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Render nested replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {post.replies.map((reply) => (
            <PostItem
              key={reply.id}
              post={reply}
              threadId={threadId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const { data, isLoading, error } = useDiscussionThread(threadId);
  const { mutateAsync: createPost, isPending: isSubmitting } = useCreatePost();

  const [newReply, setNewReply] = useState("");

  const thread = data?.thread;
  const posts = data?.posts || [];

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !thread) return;

    try {
      await createPost({
        threadId,
        content: newReply.trim(),
        isAnonymous: false,
      });
      setNewReply("");
    } catch (err) {
      console.error("Failed to post reply:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Error Loading Discussion</h3>
          <p className="text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!thread) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Discussion Not Found</h3>
          <p className="text-muted-foreground">
            This discussion may have been deleted or you don't have access to it.
          </p>
        </CardContent>
      </Card>
    );
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
              {thread.created_at
                ? formatDistanceToNow(new Date(thread.created_at), {
                    addSuffix: true,
                  })
                : "Unknown"}
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
            <PostItem key={post.id} post={post} threadId={threadId} />
          ))}

          {posts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No replies yet. Be the first!
                </p>
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

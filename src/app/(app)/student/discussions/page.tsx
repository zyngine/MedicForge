"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
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
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMyDiscussionThreads } from "@/lib/hooks/use-discussions";

export default function DiscussionsPage() {
  const { data: threads = [], isLoading, error } = useMyDiscussionThreads();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (thread.content && thread.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <h3 className="font-semibold mb-2">Error Loading Discussions</h3>
          <p className="text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
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
                          {thread.created_at
                            ? formatDistanceToNow(new Date(thread.created_at), {
                                addSuffix: true,
                              })
                            : "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {thread.posts_count || 0} replies
                        </span>
                        {thread.course && (
                          <Badge variant="outline" className="text-xs">
                            {thread.course.title}
                          </Badge>
                        )}
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

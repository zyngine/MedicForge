"use client";

/* eslint-disable react-hooks/exhaustive-deps */

 

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { MessageCircle, ThumbsUp, ChevronDown, ChevronRight } from "lucide-react";

interface Discussion {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  ce_users: { first_name: string; last_name: string } | null;
}

interface Reply {
  id: string;
  discussion_id: string;
  user_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  ce_users: { first_name: string; last_name: string } | null;
}

export default function CECourseDiscussionPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const supabase = createCEClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data } = await supabase
      .from("ce_discussions")
      .select("id, course_id, user_id, title, body, is_pinned, likes_count, replies_count, created_at, ce_users(first_name, last_name)")
      .eq("course_id", courseId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    setDiscussions((data as Discussion[]) || []);
    setIsLoading(false);
  };

  const loadReplies = async (discussionId: string) => {
    if (replies[discussionId]) return;
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_discussion_replies")
      .select("id, discussion_id, user_id, body, likes_count, created_at, ce_users(first_name, last_name)")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    setReplies((prev) => ({ ...prev, [discussionId]: (data as Reply[]) || [] }));
  };

  useEffect(() => { if (courseId) load(); }, [courseId]);

  const toggleExpand = (id: string) => {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) loadReplies(next);
  };

  const postDiscussion = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    if (!currentUserId) {
      alert("You must be signed in to post a discussion.");
      return;
    }
    setPosting(true);
    const supabase = createCEClient();
    await supabase.from("ce_discussions").insert({
      course_id: courseId,
      user_id: currentUserId,
      title: newTitle.trim(),
      body: newBody.trim(),
    });
    setNewTitle("");
    setNewBody("");
    setShowNewForm(false);
    setPosting(false);
    load();
  };

  const postReply = async (discussionId: string) => {
    if (!replyBody.trim()) return;
    if (!currentUserId) {
      alert("You must be signed in to reply.");
      return;
    }
    setPosting(true);
    const supabase = createCEClient();
    await supabase.from("ce_discussion_replies").insert({
      discussion_id: discussionId,
      user_id: currentUserId,
      body: replyBody.trim(),
    });
    setReplyBody("");
    setReplyingTo(null);
    setPosting(false);
    setReplies((prev) => { const next = { ...prev }; delete next[discussionId]; return next; });
    loadReplies(discussionId);
    load();
  };

  const likeDiscussion = async (d: Discussion) => {
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_discussion_likes").insert({ discussion_id: d.id, user_id: currentUserId });
    if (!error) {
      await supabase.from("ce_discussions").update({ likes_count: d.likes_count + 1 }).eq("id", d.id);
      setDiscussions((prev) => prev.map((x) => x.id === d.id ? { ...x, likes_count: x.likes_count + 1 } : x));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discussion</h1>
          <p className="text-muted-foreground text-sm mt-1">{discussions.length} thread{discussions.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)}>{showNewForm ? "Cancel" : "New Thread"}</Button>
      </div>

      {showNewForm && (
        <div className="bg-card border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">Start a Discussion</h2>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Thread title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm resize-none"
            rows={4}
            placeholder="Write your post..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <Button onClick={postDiscussion} disabled={posting || !newTitle.trim() || !newBody.trim()}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : discussions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No discussions yet</p>
          <p className="text-xs mt-1">Be the first to start a thread.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <div key={d.id} className="bg-card border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(d.id)}
                className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {d.is_pinned && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Pinned</span>}
                    <p className="font-medium text-sm">{d.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {d.ce_users ? `${(d.ce_users as any).first_name} ${(d.ce_users as any).last_name}` : "Unknown"} · {new Date(d.created_at).toLocaleDateString()} · {d.replies_count} replies · {d.likes_count} likes
                  </p>
                </div>
                {expanded === d.id
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
              </button>

              {expanded === d.id && (
                <div className="border-t">
                  <div className="px-5 py-4 bg-muted/30 space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{d.body}</p>
                    <button onClick={() => likeDiscussion(d)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <ThumbsUp className="h-3.5 w-3.5" />{d.likes_count}
                    </button>
                  </div>

                  {(replies[d.id] || []).map((r) => (
                    <div key={r.id} className="px-5 py-3 border-t ml-6">
                      <p className="text-xs text-muted-foreground mb-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {r.ce_users ? `${(r.ce_users as any).first_name} ${(r.ce_users as any).last_name}` : "Unknown"} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}

                  {replyingTo === d.id ? (
                    <div className="px-5 py-3 border-t space-y-2">
                      <textarea
                        className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                        rows={3}
                        placeholder="Write a reply..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => postReply(d.id)} disabled={posting || !replyBody.trim()}>
                          {posting ? "Posting..." : "Reply"}
                        </Button>
                        <Button variant="outline" onClick={() => { setReplyingTo(null); setReplyBody(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(d.id)}
                      className="w-full text-left px-5 py-3 border-t text-xs text-blue-700 hover:bg-muted/30"
                    >
                      Reply to this thread...
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

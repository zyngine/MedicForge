"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DiscussionThread, DiscussionPost, User } from "@/types";

export interface ThreadWithAuthor extends DiscussionThread {
  author?: Pick<User, "id" | "full_name" | "email">;
  posts_count?: number;
  last_post_at?: string;
}

export interface PostWithAuthor extends DiscussionPost {
  author?: Pick<User, "id" | "full_name" | "email">;
  replies?: PostWithAuthor[];
}

interface ThreadForm {
  courseId: string;
  moduleId?: string;
  title: string;
  content: string;
  isAnonymousAllowed?: boolean;
}

interface PostForm {
  threadId: string;
  parentId?: string;
  content: string;
  isAnonymous?: boolean;
}

// Hook for discussion threads in a course
export function useDiscussionThreads(courseId: string | null, moduleId?: string) {
  const [threads, setThreads] = useState<ThreadWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchThreads = useCallback(async () => {
    if (!courseId) {
      setThreads([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("discussion_threads")
        .select(`
          *,
          author:users!discussion_threads_author_id_fkey(id, full_name, email),
          posts:discussion_posts(count)
        `)
        .eq("course_id", courseId)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (moduleId) {
        query = query.eq("module_id", moduleId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedThreads: ThreadWithAuthor[] = (data || []).map((thread: any) => ({
        ...thread,
        author: thread.author || undefined,
        posts_count: thread.posts?.[0]?.count || 0,
      }));

      setThreads(transformedThreads);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch discussion threads"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, courseId, moduleId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const createThread = async (threadData: ThreadForm): Promise<DiscussionThread | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("discussion_threads")
        .insert([{
          tenant_id: userData.tenant_id,
          course_id: threadData.courseId,
          module_id: threadData.moduleId || null,
          title: threadData.title,
          content: threadData.content,
          author_id: user.id,
          is_pinned: false,
          is_locked: false,
          is_anonymous_allowed: threadData.isAnonymousAllowed || false,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchThreads();
      return data as DiscussionThread;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create thread";
      setError(new Error(message));
      throw err;
    }
  };

  const updateThread = async (
    threadId: string,
    updates: { title?: string; content?: string }
  ): Promise<DiscussionThread | null> => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;

      const { data, error: updateError } = await supabase
        .from("discussion_threads")
        .update(updateData)
        .eq("id", threadId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchThreads();
      return data as DiscussionThread;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update thread"));
      return null;
    }
  };

  const deleteThread = async (threadId: string): Promise<boolean> => {
    try {
      // First delete all posts in the thread
      const { error: postsError } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("thread_id", threadId);

      if (postsError) throw postsError;

      // Then delete the thread
      const { error: deleteError } = await supabase
        .from("discussion_threads")
        .delete()
        .eq("id", threadId);

      if (deleteError) throw deleteError;

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete thread"));
      return false;
    }
  };

  const pinThread = async (threadId: string, isPinned: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("discussion_threads")
        .update({ is_pinned: isPinned })
        .eq("id", threadId);

      if (updateError) throw updateError;

      await fetchThreads();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update thread"));
      return false;
    }
  };

  const lockThread = async (threadId: string, isLocked: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("discussion_threads")
        .update({ is_locked: isLocked })
        .eq("id", threadId);

      if (updateError) throw updateError;

      await fetchThreads();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update thread"));
      return false;
    }
  };

  return {
    threads,
    isLoading,
    error,
    refetch: fetchThreads,
    createThread,
    updateThread,
    deleteThread,
    pinThread,
    lockThread,
  };
}

// Hook for a single discussion thread with posts
export function useDiscussionThread(threadId: string | null) {
  const [thread, setThread] = useState<ThreadWithAuthor | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchThread = useCallback(async () => {
    if (!threadId) {
      setThread(null);
      setPosts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch thread
      const { data: threadData, error: threadError } = await supabase
        .from("discussion_threads")
        .select(`
          *,
          author:users!discussion_threads_author_id_fkey(id, full_name, email)
        `)
        .eq("id", threadId)
        .single();

      if (threadError) throw threadError;

      setThread({
        ...threadData,
        author: threadData.author || undefined,
      } as ThreadWithAuthor);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("discussion_posts")
        .select(`
          *,
          author:users!discussion_posts_author_id_fkey(id, full_name, email)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (postsError) throw postsError;

      // Build nested post structure
      const postMap = new Map<string, PostWithAuthor>();
      const rootPosts: PostWithAuthor[] = [];

      (postsData || []).forEach((post: any) => {
        const transformedPost: PostWithAuthor = {
          ...post,
          author: post.author || undefined,
          replies: [],
        };
        postMap.set(post.id, transformedPost);
      });

      postMap.forEach((post) => {
        if (post.parent_id && postMap.has(post.parent_id)) {
          const parent = postMap.get(post.parent_id)!;
          parent.replies = parent.replies || [];
          parent.replies.push(post);
        } else if (!post.parent_id) {
          rootPosts.push(post);
        }
      });

      setPosts(rootPosts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch discussion thread"));
    } finally {
      setIsLoading(false);
    }
  }, [threadId, supabase]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const createPost = async (postData: PostForm): Promise<DiscussionPost | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("discussion_posts")
        .insert([{
          tenant_id: userData.tenant_id,
          thread_id: postData.threadId,
          parent_id: postData.parentId || null,
          content: postData.content,
          author_id: user.id,
          is_anonymous: postData.isAnonymous || false,
          upvotes: 0,
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Update thread's updated_at
      await supabase
        .from("discussion_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", postData.threadId);

      await fetchThread();
      return data as DiscussionPost;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create post";
      setError(new Error(message));
      throw err;
    }
  };

  const updatePost = async (
    postId: string,
    content: string
  ): Promise<DiscussionPost | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("discussion_posts")
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchThread();
      return data as DiscussionPost;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update post"));
      return null;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      // Delete replies first
      const { error: repliesError } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("parent_id", postId);

      if (repliesError) throw repliesError;

      // Delete the post
      const { error: deleteError } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("id", postId);

      if (deleteError) throw deleteError;

      await fetchThread();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete post"));
      return false;
    }
  };

  const upvotePost = async (postId: string): Promise<boolean> => {
    try {
      // Get current upvotes
      const post = posts.find(p => p.id === postId) ||
        posts.flatMap(p => p.replies || []).find(r => r.id === postId);

      if (!post) {
        // Try to fetch current upvotes from DB
        const { data: postData } = await supabase
          .from("discussion_posts")
          .select("upvotes")
          .eq("id", postId)
          .single();

        const currentUpvotes = postData?.upvotes || 0;

        const { error: updateError } = await supabase
          .from("discussion_posts")
          .update({ upvotes: currentUpvotes + 1 })
          .eq("id", postId);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("discussion_posts")
          .update({ upvotes: post.upvotes + 1 })
          .eq("id", postId);

        if (updateError) throw updateError;
      }

      await fetchThread();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upvote post"));
      return false;
    }
  };

  return {
    thread,
    posts,
    isLoading,
    error,
    refetch: fetchThread,
    createPost,
    updatePost,
    deletePost,
    upvotePost,
  };
}

// Hook for searching discussions
export function useSearchDiscussions(courseId: string | null, searchQuery: string) {
  const [results, setResults] = useState<{
    threads: ThreadWithAuthor[];
    posts: PostWithAuthor[];
  }>({ threads: [], posts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const search = useCallback(async () => {
    if (!courseId || !searchQuery || searchQuery.length < 2) {
      setResults({ threads: [], posts: [] });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Search threads
      const { data: threadsData, error: threadsError } = await supabase
        .from("discussion_threads")
        .select(`
          *,
          author:users!discussion_threads_author_id_fkey(id, full_name, email)
        `)
        .eq("course_id", courseId)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(20);

      if (threadsError) throw threadsError;

      // Search posts
      const { data: postsData, error: postsError } = await supabase
        .from("discussion_posts")
        .select(`
          *,
          author:users!discussion_posts_author_id_fkey(id, full_name, email),
          thread:discussion_threads!inner(course_id)
        `)
        .eq("thread.course_id", courseId)
        .ilike("content", `%${searchQuery}%`)
        .limit(20);

      if (postsError) throw postsError;

      setResults({
        threads: (threadsData || []).map((t: any) => ({
          ...t,
          author: t.author || undefined,
        })),
        posts: (postsData || []).map((p: any) => ({
          ...p,
          author: p.author || undefined,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to search discussions"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, searchQuery, supabase]);

  useEffect(() => {
    const debounceTimer = setTimeout(search, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  return { results, isLoading, error };
}

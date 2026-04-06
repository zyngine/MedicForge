"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface ThreadForm {
  courseId: string;
  moduleId?: string;
  title: string;
  content: string;
  isAnonymousAllowed?: boolean;
}

export interface PostForm {
  threadId: string;
  parentId?: string;
  content: string;
  isAnonymous?: boolean;
}

// Query keys
const discussionKeys = {
  all: ["discussions"] as const,
  threads: () => [...discussionKeys.all, "threads"] as const,
  threadList: (courseId: string, moduleId?: string) =>
    [...discussionKeys.threads(), courseId, moduleId] as const,
  threadDetails: () => [...discussionKeys.all, "thread"] as const,
  threadDetail: (threadId: string) =>
    [...discussionKeys.threadDetails(), threadId] as const,
  posts: (threadId: string) => [...discussionKeys.all, "posts", threadId] as const,
  search: (courseId: string, query: string) =>
    [...discussionKeys.all, "search", courseId, query] as const,
};

// Fetch threads for a course
async function fetchDiscussionThreads(
  courseId: string,
  moduleId?: string
): Promise<ThreadWithAuthor[]> {
  const supabase = createClient();

  let query = supabase
    .from("discussion_threads")
    .select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, email),
      posts:discussion_posts(count)
    `
    )
    .eq("course_id", courseId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (moduleId) {
    query = query.eq("module_id", moduleId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((thread: any) => ({
    ...thread,
    author: thread.author || undefined,
    posts_count: thread.posts?.[0]?.count || 0,
  }));
}

// Fetch single thread with nested posts
async function fetchDiscussionThread(threadId: string): Promise<{
  thread: ThreadWithAuthor;
  posts: PostWithAuthor[];
}> {
  const supabase = createClient();

  // Fetch thread
  const { data: threadData, error: threadError } = await supabase
    .from("discussion_threads")
    .select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, email)
    `
    )
    .eq("id", threadId)
    .single();

  if (threadError) throw threadError;

  // Fetch posts
  const { data: postsData, error: postsError } = await supabase
    .from("discussion_posts")
    .select(
      `
      *,
      author:users!discussion_posts_author_id_fkey(id, full_name, email)
    `
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (postsError) throw postsError;

  // Build nested post structure
  const postMap = new Map<string, PostWithAuthor>();
  const rootPosts: PostWithAuthor[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return {
    thread: {
      ...threadData,
      author: threadData.author || undefined,
    } as ThreadWithAuthor,
    posts: rootPosts,
  };
}

// Hook for discussion threads in a course
export function useDiscussionThreads(courseId: string | null, moduleId?: string) {
  return useQuery({
    queryKey: discussionKeys.threadList(courseId || "", moduleId),
    queryFn: () => fetchDiscussionThreads(courseId!, moduleId),
    enabled: !!courseId,
  });
}

// Hook for a single discussion thread with posts
export function useDiscussionThread(threadId: string | null) {
  return useQuery({
    queryKey: discussionKeys.threadDetail(threadId || ""),
    queryFn: () => fetchDiscussionThread(threadId!),
    enabled: !!threadId,
  });
}

// Hook for searching discussions
export function useSearchDiscussions(courseId: string | null, searchQuery: string) {
  return useQuery({
    queryKey: discussionKeys.search(courseId || "", searchQuery),
    queryFn: async () => {
      if (!courseId || !searchQuery || searchQuery.length < 2) {
        return { threads: [], posts: [] };
      }

      const supabase = createClient();

      // Search threads
      const { data: threadsData, error: threadsError } = await supabase
        .from("discussion_threads")
        .select(
          `
          *,
          author:users!discussion_threads_author_id_fkey(id, full_name, email)
        `
        )
        .eq("course_id", courseId)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(20);

      if (threadsError) throw threadsError;

      // Search posts
      const { data: postsData, error: postsError } = await supabase
        .from("discussion_posts")
        .select(
          `
          *,
          author:users!discussion_posts_author_id_fkey(id, full_name, email),
          thread:discussion_threads!inner(course_id)
        `
        )
        .eq("thread.course_id", courseId)
        .ilike("content", `%${searchQuery}%`)
        .limit(20);

      if (postsError) throw postsError;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threads: (threadsData || []).map((t: any) => ({
          ...t,
          author: t.author || undefined,
        })) as ThreadWithAuthor[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        posts: (postsData || []).map((p: any) => ({
          ...p,
          author: p.author || undefined,
        })) as PostWithAuthor[],
      };
    },
    enabled: !!courseId && !!searchQuery && searchQuery.length >= 2,
  });
}

// Mutation: Create thread
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadData: ThreadForm) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from("discussion_threads")
        .insert([
          {
            tenant_id: userData.tenant_id,
            course_id: threadData.courseId,
            module_id: threadData.moduleId || null,
            title: threadData.title,
            content: threadData.content,
            author_id: user.id,
            is_pinned: false,
            is_locked: false,
            is_anonymous_allowed: threadData.isAnonymousAllowed || false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as DiscussionThread;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadList(variables.courseId, variables.moduleId),
      });
    },
  });
}

// Mutation: Update thread
export function useUpdateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      updates,
    }: {
      threadId: string;
      updates: { title?: string; content?: string };
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;

      const { data, error } = await supabase
        .from("discussion_threads")
        .update(updateData)
        .eq("id", threadId)
        .select()
        .single();

      if (error) throw error;
      return data as DiscussionThread;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(data.id),
      });
    },
  });
}

// Mutation: Delete thread
export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const supabase = createClient();

      // First delete all posts in the thread
      const { error: postsError } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("thread_id", threadId);

      if (postsError) throw postsError;

      // Then delete the thread
      const { error } = await supabase
        .from("discussion_threads")
        .delete()
        .eq("id", threadId);

      if (error) throw error;
      return threadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
    },
  });
}

// Mutation: Pin thread
export function usePinThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      isPinned,
    }: {
      threadId: string;
      isPinned: boolean;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("discussion_threads")
        .update({ is_pinned: isPinned })
        .eq("id", threadId)
        .select()
        .single();

      if (error) throw error;
      return data as DiscussionThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
    },
  });
}

// Mutation: Lock thread
export function useLockThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      isLocked,
    }: {
      threadId: string;
      isLocked: boolean;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("discussion_threads")
        .update({ is_locked: isLocked })
        .eq("id", threadId)
        .select()
        .single();

      if (error) throw error;
      return data as DiscussionThread;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(data.id),
      });
    },
  });
}

// Mutation: Create post
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postData: PostForm) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from("discussion_posts")
        .insert([
          {
            tenant_id: userData.tenant_id,
            thread_id: postData.threadId,
            parent_id: postData.parentId || null,
            content: postData.content,
            author_id: user.id,
            is_anonymous: postData.isAnonymous || false,
            upvotes: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update thread's updated_at
      await supabase
        .from("discussion_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", postData.threadId);

      return data as DiscussionPost;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(variables.threadId),
      });
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
    },
  });
}

// Mutation: Update post
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("discussion_posts")
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select("*, thread_id")
        .single();

      if (error) throw error;
      return data as DiscussionPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(data.thread_id),
      });
    },
  });
}

// Mutation: Delete post
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      threadId,
    }: {
      postId: string;
      threadId: string;
    }) => {
      const supabase = createClient();

      // Delete replies first
      const { error: repliesError } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("parent_id", postId);

      if (repliesError) throw repliesError;

      // Delete the post
      const { error } = await supabase
        .from("discussion_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
      return { postId, threadId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(result.threadId),
      });
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads() });
    },
  });
}

// Mutation: Upvote post
export function useUpvotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      threadId,
    }: {
      postId: string;
      threadId: string;
    }) => {
      const supabase = createClient();

      // Get current upvotes
      const { data: postData, error: fetchError } = await supabase
        .from("discussion_posts")
        .select("upvotes")
        .eq("id", postId)
        .single();

      if (fetchError) throw fetchError;

      const currentUpvotes = postData?.upvotes || 0;

      const { data, error } = await supabase
        .from("discussion_posts")
        .update({ upvotes: currentUpvotes + 1 })
        .eq("id", postId)
        .select()
        .single();

      if (error) throw error;
      return { post: data as DiscussionPost, threadId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: discussionKeys.threadDetail(result.threadId),
      });
    },
  });
}

// Hook for all discussion threads from enrolled courses (for student discussions page)
export function useMyDiscussionThreads() {
  return useQuery({
    queryKey: [...discussionKeys.all, "my-threads"],
    queryFn: async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      // Get user's enrolled courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("status", "active");

      const courseIds = enrollments?.map((e) => e.course_id) || [];

      if (courseIds.length === 0) return [];

      // Fetch threads from enrolled courses
      const { data: threadsData, error } = await supabase
        .from("discussion_threads")
        .select(
          `
          *,
          author:users!discussion_threads_author_id_fkey(id, full_name, email, avatar_url),
          course:courses!discussion_threads_course_id_fkey(id, title),
          posts:discussion_posts(count)
        `
        )
        .in("course_id", courseIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (threadsData || []).map((thread: any) => ({
        ...thread,
        author: thread.author || undefined,
        course: thread.course || undefined,
        posts_count: thread.posts?.[0]?.count || 0,
      })) as (ThreadWithAuthor & { course?: { id: string; title: string } })[];
    },
  });
}

// Backward compatibility: Legacy hook for threads
export function useDiscussionThreadsLegacy(
  courseId: string | null,
  moduleId?: string
) {
  const query = useDiscussionThreads(courseId, moduleId);
  const createMutation = useCreateThread();
  const updateMutation = useUpdateThread();
  const deleteMutation = useDeleteThread();
  const pinMutation = usePinThread();
  const lockMutation = useLockThread();

  return {
    threads: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createThread: createMutation.mutateAsync,
    updateThread: async (
      threadId: string,
      updates: { title?: string; content?: string }
    ) => updateMutation.mutateAsync({ threadId, updates }),
    deleteThread: async (threadId: string) => {
      await deleteMutation.mutateAsync(threadId);
      return true;
    },
    pinThread: async (threadId: string, isPinned: boolean) => {
      await pinMutation.mutateAsync({ threadId, isPinned });
      return true;
    },
    lockThread: async (threadId: string, isLocked: boolean) => {
      await lockMutation.mutateAsync({ threadId, isLocked });
      return true;
    },
  };
}

// Backward compatibility: Legacy hook for single thread
export function useDiscussionThreadLegacy(threadId: string | null) {
  const query = useDiscussionThread(threadId);
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();
  const upvoteMutation = useUpvotePost();

  return {
    thread: query.data?.thread || null,
    posts: query.data?.posts || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createPost: createPostMutation.mutateAsync,
    updatePost: async (postId: string, content: string) =>
      updatePostMutation.mutateAsync({ postId, content }),
    deletePost: async (postId: string) => {
      if (!threadId) return false;
      await deletePostMutation.mutateAsync({ postId, threadId });
      return true;
    },
    upvotePost: async (postId: string) => {
      if (!threadId) return false;
      await upvoteMutation.mutateAsync({ postId, threadId });
      return true;
    },
  };
}

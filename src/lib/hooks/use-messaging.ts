"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  tenant_id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
  role: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reply_to?: Message;
}

// Helper to get db with type assertion
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

// Hook for listing conversations
export function useConversations() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ["conversations", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:users(id, full_name, email, avatar_url)
          ),
          messages:messages(
            id,
            content,
            content_type,
            sender_id,
            created_at
          )
        `)
        .eq("tenant_id", tenant.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Process conversations to add last_message and calculate unread
      return (data || []).map((conv: Conversation & { messages: Message[] }) => {
        const myParticipant = conv.participants?.find((p) => p.user_id === user.id);
        const lastReadAt = myParticipant?.last_read_at
          ? new Date(myParticipant.last_read_at)
          : new Date(0);

        const unreadCount = conv.messages?.filter(
          (m) =>
            m.sender_id !== user.id &&
            new Date(m.created_at) > lastReadAt
        ).length || 0;

        const lastMessage = conv.messages?.[0];

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount,
          messages: undefined, // Remove messages array from conversation object
        } as Conversation;
      });
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!tenant?.id || !user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, user?.id, refetch]);

  return {
    conversations,
    isLoading,
    refetch,
  };
}

// Hook for a single conversation with messages
export function useConversation(conversationId: string | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId || !tenant?.id) return null;

      const db = getDb();
      const { data, error } = await db
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:users(id, full_name, email, avatar_url)
          )
        `)
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    enabled: !!conversationId && !!tenant?.id,
  });

  // Fetch messages with pagination
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId || !tenant?.id) return { messages: [], nextCursor: null };

      const db = getDb();
      const limit = 50;
      const { data, error } = await db
        .from("messages")
        .select(`
          *,
          sender:users(id, full_name, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(pageParam * limit, (pageParam + 1) * limit - 1);

      if (error) throw error;

      return {
        messages: (data || []).reverse() as Message[],
        nextCursor: (data?.length ?? 0) === limit ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!conversationId && !!tenant?.id,
  });

  // Flatten messages from all pages
  const messages = messagesData?.pages.flatMap((page) => page.messages) || [];

  // Mark conversation as read
  const markAsRead = async () => {
    if (!conversationId || !user?.id) return;

    const db = getDb();
    await db
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId || !tenant?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          markAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, tenant?.id, queryClient]);

  return {
    conversation,
    messages,
    isLoading: conversationLoading || messagesLoading,
    fetchNextPage,
    hasNextPage,
    markAsRead,
  };
}

// Hook for sending messages
export function useSendMessage() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId,
      content,
      contentType = "text",
      fileUrl,
      fileName,
      fileSize,
      replyToId,
    }: {
      conversationId: string;
      content: string;
      contentType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyToId?: string;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { data, error } = await db.rpc("send_message", {
        p_tenant_id: tenant.id,
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: content,
        p_content_type: contentType,
        p_file_url: fileUrl || null,
        p_file_name: fileName || null,
        p_file_size: fileSize || null,
        p_reply_to_id: replyToId || null,
      });

      if (error) throw error;
      return data as Message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    error: sendMessage.error,
  };
}

// Hook for starting a new conversation
export function useStartConversation() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const startConversation = useMutation({
    mutationFn: async ({
      participantId,
      initialMessage,
    }: {
      participantId: string;
      initialMessage?: string;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();

      // Get or create direct conversation
      const { data: conversation, error } = await db.rpc(
        "get_or_create_direct_conversation",
        {
          p_tenant_id: tenant.id,
          p_user1_id: user.id,
          p_user2_id: participantId,
        }
      );

      if (error) throw error;

      // Send initial message if provided
      if (initialMessage && conversation) {
        await db.rpc("send_message", {
          p_tenant_id: tenant.id,
          p_conversation_id: conversation.id,
          p_sender_id: user.id,
          p_content: initialMessage,
          p_content_type: "text",
          p_file_url: null,
          p_file_name: null,
          p_file_size: null,
          p_reply_to_id: null,
        });
      }

      return conversation as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    startConversation: startConversation.mutateAsync,
    isStarting: startConversation.isPending,
    error: startConversation.error,
  };
}

// Hook for getting users to message
export function useMessageableUsers() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["messageable-users", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .eq("tenant_id", tenant.id)
        .neq("id", user.id)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

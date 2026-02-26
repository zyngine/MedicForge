"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import { useEffect } from "react";

// Simple direct message interface
export interface DirectMessage {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  content: string;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_read: boolean;
  created_at: string;
  is_mine?: boolean;
}

// Conversation summary (grouped by other user)
export interface Conversation {
  id: string; // other_user_id as id for compatibility
  other_user_id: string;
  other_user_name: string;
  other_user_email: string | null;
  other_user_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  // Compatibility fields
  title: string | null;
  is_group: boolean;
  participants?: ConversationParticipant[];
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

// Legacy Message interface for compatibility
export interface Message {
  id: string;
  tenant_id?: string;
  conversation_id?: string;
  sender_id: string;
  content: string;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to_id?: string | null;
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
}

// Hook for listing conversations (users you've messaged with)
export function useConversations() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ["conversations", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const supabase = createClient();

      // Use the RPC function to get conversations
      const { data, error } = await supabase.rpc("get_user_conversations", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }

      // Transform to Conversation format for compatibility
      return (data || []).map((conv: {
        other_user_id: string;
        other_user_name: string;
        other_user_email: string | null;
        other_user_avatar: string | null;
        last_message: string;
        last_message_at: string;
        unread_count: number;
      }) => ({
        id: conv.other_user_id,
        other_user_id: conv.other_user_id,
        other_user_name: conv.other_user_name || "Unknown User",
        other_user_email: conv.other_user_email,
        other_user_avatar: conv.other_user_avatar,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at,
        unread_count: Number(conv.unread_count) || 0,
        // Compatibility fields
        title: conv.other_user_name,
        is_group: false,
        participants: [
          {
            id: conv.other_user_id,
            user_id: conv.other_user_id,
            user: {
              id: conv.other_user_id,
              full_name: conv.other_user_name || "Unknown User",
              email: conv.other_user_email || "",
              avatar_url: conv.other_user_avatar,
            },
          },
        ],
      })) as Conversation[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!tenant?.id || !user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel("direct_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          // Only refetch if this message involves the current user
          const msg = payload.new as DirectMessage;
          if (msg.from_user_id === user.id || msg.to_user_id === user.id) {
            refetch();
          }
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

  // conversationId is actually the other user's ID in our simple model
  const otherUserId = conversationId;

  // Fetch messages with this user
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch,
  } = useQuery({
    queryKey: ["messages", otherUserId, user?.id],
    queryFn: async () => {
      if (!otherUserId || !user?.id) return [];

      const supabase = createClient();

      const { data, error } = await supabase.rpc("get_messages_with_user", {
        p_user_id: user.id,
        p_other_user_id: otherUserId,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }

      // Transform to Message format for compatibility
      return (data || []).map((msg: DirectMessage) => ({
        id: msg.id,
        sender_id: msg.from_user_id,
        content: msg.content,
        content_type: msg.content_type,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_size: msg.file_size,
        is_edited: false,
        edited_at: null,
        is_deleted: false,
        deleted_at: null,
        created_at: msg.created_at,
        sender: {
          id: msg.from_user_id,
          full_name: msg.from_user_name,
          avatar_url: null,
        },
      })) as Message[];
    },
    enabled: !!otherUserId && !!user?.id,
  });

  // Create a fake conversation object for compatibility
  const conversation: Conversation | null = otherUserId
    ? {
        id: otherUserId,
        other_user_id: otherUserId,
        other_user_name: "",
        other_user_email: null,
        other_user_avatar: null,
        last_message: "",
        last_message_at: "",
        unread_count: 0,
        title: null,
        is_group: false,
      }
    : null;

  // Mark as read function (handled automatically by get_messages_with_user)
  const markAsRead = async () => {
    // Already handled in the RPC function
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!otherUserId || !user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          // Only update if this message is part of this conversation
          if (
            (msg.from_user_id === user.id && msg.to_user_id === otherUserId) ||
            (msg.from_user_id === otherUserId && msg.to_user_id === user.id)
          ) {
            refetch();
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId, user?.id, refetch, queryClient]);

  return {
    conversation,
    messages: messagesData || [],
    isLoading: messagesLoading,
    fetchNextPage: () => {}, // Pagination not implemented for simplicity
    hasNextPage: false,
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
      conversationId, // This is actually the recipient's user ID
      content,
      contentType = "text",
      fileUrl,
      fileName,
      fileSize,
    }: {
      conversationId: string;
      content: string;
      contentType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const supabase = createClient();

      const { data, error } = await supabase.rpc("send_direct_message", {
        p_tenant_id: tenant.id,
        p_from_user_id: user.id,
        p_to_user_id: conversationId,
        p_content: content,
        p_content_type: contentType,
        p_file_url: fileUrl || null,
        p_file_name: fileName || null,
        p_file_size: fileSize || null,
      });

      if (error) throw error;
      return data as DirectMessage;
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

// Hook for starting a new conversation (just returns the user ID to message)
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

      // If there's an initial message, send it
      if (initialMessage) {
        const supabase = createClient();
        await supabase.rpc("send_direct_message", {
          p_tenant_id: tenant.id,
          p_from_user_id: user.id,
          p_to_user_id: participantId,
          p_content: initialMessage,
          p_content_type: "text",
          p_file_url: null,
          p_file_name: null,
          p_file_size: null,
        });
      }

      // Return a conversation-like object
      return {
        id: participantId,
        other_user_id: participantId,
        other_user_name: "",
        other_user_email: null,
        other_user_avatar: null,
        last_message: initialMessage || "",
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        title: null,
        is_group: false,
      } as Conversation;
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

      if (error) {
        console.error("Error fetching messageable users:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

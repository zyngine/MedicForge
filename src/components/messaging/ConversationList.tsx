"use client";

import { MessageCircle, Search, Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Avatar,
  Badge,
} from "@/components/ui";
import { useConversations, Conversation } from "@/lib/hooks/use-messaging";
import { useUser } from "@/lib/hooks/use-user";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  onNewMessage?: () => void;
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewMessage,
}: ConversationListProps) {
  const { conversations, isLoading } = useConversations();
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const filteredConversations = conversations?.filter((conv: Conversation) => {
    if (!search) return true;
    // Use direct other_user_name property from simplified schema
    return conv.other_user_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
  });

  const getConversationTitle = (conv: Conversation) => {
    // Use direct other_user_name from simplified schema
    return conv.other_user_name || conv.title || "Unknown";
  };

  const getConversationAvatar = (conv: Conversation) => {
    // Use direct other_user_avatar from simplified schema
    return conv.other_user_avatar || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h2>
          {onNewMessage && (
            <Button size="sm" onClick={onNewMessage}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            {onNewMessage && (
              <Button
                variant="link"
                className="mt-2"
                onClick={onNewMessage}
              >
                Start a new conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations?.map((conv: Conversation) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                  selectedId === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={getConversationAvatar(conv) || undefined}
                    fallback={getConversationTitle(conv).charAt(0)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {getConversationTitle(conv)}
                      </p>
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                    )}
                  </div>
                  {(conv.unread_count ?? 0) > 0 && (
                    <Badge className="ml-2">{conv.unread_count}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

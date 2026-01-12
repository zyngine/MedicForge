"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ArrowLeft, Paperclip } from "lucide-react";
import {
  Button,
  Input,
  Avatar,
} from "@/components/ui";
import {
  useConversation,
  useSendMessage,
  Conversation,
  Message,
} from "@/lib/hooks/use-messaging";
import { useUser } from "@/lib/hooks/use-user";
import { format, isToday, isYesterday } from "date-fns";

interface MessageThreadProps {
  conversationId: string;
  conversation?: Conversation;
  onBack?: () => void;
}

export function MessageThread({
  conversationId,
  conversation: initialConversation,
  onBack,
}: MessageThreadProps) {
  const { user } = useUser();
  const {
    conversation,
    messages,
    isLoading,
    markAsRead,
  } = useConversation(conversationId);

  const { sendMessage, isSending } = useSendMessage();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conv = conversation || initialConversation;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, markAsRead]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      await sendMessage({
        conversationId,
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipant = () => {
    if (!conv?.participants || !user?.id) return null;
    return conv.participants.find((p) => p.user_id !== user.id);
  };

  const otherParticipant = getOtherParticipant();
  const conversationTitle = conv?.title || otherParticipant?.user?.full_name || "Conversation";

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    for (const message of messages) {
      const messageDate = format(new Date(message.created_at), "yyyy-MM-dd");
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          messages: [message],
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    }

    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar
          src={otherParticipant?.user?.avatar_url || undefined}
          fallback={conversationTitle.charAt(0)}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{conversationTitle}</p>
          {otherParticipant?.user?.email && (
            <p className="text-xs text-muted-foreground truncate">
              {otherParticipant.user.email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">
                  {formatDateHeader(group.date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {group.messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {!isOwn && conv?.is_group && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.sender?.full_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "opacity-70" : "text-muted-foreground"
                          }`}
                        >
                          {formatMessageDate(new Date(message.created_at))}
                          {message.is_edited && " (edited)"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

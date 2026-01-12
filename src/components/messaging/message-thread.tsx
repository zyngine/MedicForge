"use client";

import * as React from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Send, Paperclip, Smile, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date | string;
  status?: "sending" | "sent" | "delivered" | "read";
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size?: number;
  }>;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function MessageThread({
  messages,
  currentUserId,
  onSendMessage,
  onLoadMore,
  hasMoreMessages,
  isLoading,
  className,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  };

  const groupMessagesByDate = () => {
    const groups: Array<{ date: string; messages: Message[] }> = [];
    let currentDate = "";

    messages.forEach((message) => {
      const d = typeof message.timestamp === "string"
        ? new Date(message.timestamp)
        : message.timestamp;
      const dateKey = format(d, "yyyy-MM-dd");

      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({
          date: format(d, "MMMM d, yyyy"),
          messages: [message],
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {hasMoreMessages && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load earlier messages"}
            </Button>
          </div>
        )}

        {groupMessagesByDate().map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">{group.date}</span>
              <div className="flex-1 border-t" />
            </div>

            {/* Messages */}
            {group.messages.map((message) => {
              const isOwn = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 mb-3",
                    isOwn && "flex-row-reverse"
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName} />
                      ) : (
                        <div className="bg-primary/10 w-full h-full flex items-center justify-center text-sm font-medium">
                          {message.senderName.charAt(0)}
                        </div>
                      )}
                    </Avatar>
                  )}

                  <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                    {!isOwn && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {message.senderName}
                      </p>
                    )}

                    {/* Reply preview */}
                    {message.replyTo && (
                      <div className="bg-muted/50 rounded-t-lg px-3 py-2 text-sm border-l-2 border-primary">
                        <p className="text-xs text-muted-foreground">{message.replyTo.senderName}</p>
                        <p className="truncate">{message.replyTo.content}</p>
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-lg px-3 py-2",
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                        message.replyTo && "rounded-t-none"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 text-sm p-2 rounded",
                                isOwn
                                  ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                  : "bg-background hover:bg-background/80"
                              )}
                            >
                              <Paperclip className="h-4 w-4" />
                              <span className="truncate">{attachment.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1 text-xs text-muted-foreground",
                        isOwn && "justify-end"
                      )}
                    >
                      <span>{formatMessageDate(message.timestamp)}</span>
                      {isOwn && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Conversation list item
interface ConversationItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date | string;
  unreadCount?: number;
  isOnline?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ConversationItem({
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isOnline,
  isSelected,
  onClick,
}: ConversationItemProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-muted"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          {avatar ? (
            <img src={avatar} alt={name} />
          ) : (
            <div className="bg-primary/10 w-full h-full flex items-center justify-center text-lg font-medium">
              {name.charAt(0)}
            </div>
          )}
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{name}</span>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
        )}
      </div>

      {unreadCount && unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

// Conversations list
interface ConversationsListProps {
  conversations: Array<{
    id: string;
    name: string;
    avatar?: string;
    lastMessage?: string;
    lastMessageTime?: Date | string;
    unreadCount?: number;
    isOnline?: boolean;
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function ConversationsList({
  conversations,
  selectedId,
  onSelect,
  className,
}: ConversationsListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          {...conversation}
          isSelected={conversation.id === selectedId}
          onClick={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  );
}

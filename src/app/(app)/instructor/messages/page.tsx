"use client";

import { useState } from "react";
import { Card, CardContent, Button, Avatar, Input, Badge, Modal, Spinner } from "@/components/ui";
import { MessageCircle, Search, Plus, Users } from "lucide-react";
import { ConversationList, MessageThread } from "@/components/messaging";
import { useStartConversation, useMessageableUsers, Conversation } from "@/lib/hooks/use-messaging";

export default function InstructorMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");

  const { data: users = [], isLoading: usersLoading } = useMessageableUsers();
  const { startConversation, isStarting } = useStartConversation();

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const handleStartConversation = async (userId: string) => {
    try {
      const conversation = await startConversation({ participantId: userId });
      setSelectedConversation(conversation);
      setShowNewMessage(false);
      setSearchUsers("");
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "instructor":
        return <Badge variant="info">Instructor</Badge>;
      case "student":
        return <Badge variant="success">Student</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Messages
        </h1>
        <p className="text-muted-foreground">
          Send direct messages to students and other instructors
        </p>
      </div>

      {/* Main Content */}
      <Card className="h-[calc(100%-5rem)]">
        <CardContent className="p-0 h-full">
          <div className="flex h-full">
            {/* Conversation List - Left Panel */}
            <div className={`w-full md:w-80 border-r flex-shrink-0 ${selectedConversation ? "hidden md:block" : ""}`}>
              <ConversationList
                selectedId={selectedConversation?.id}
                onSelect={setSelectedConversation}
                onNewMessage={() => setShowNewMessage(true)}
              />
            </div>

            {/* Message Thread - Right Panel */}
            <div className={`flex-1 ${!selectedConversation ? "hidden md:flex" : "flex"}`}>
              {selectedConversation ? (
                <div className="w-full">
                  <MessageThread
                    conversationId={selectedConversation.id}
                    conversation={selectedConversation}
                    onBack={() => setSelectedConversation(null)}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Choose a conversation from the list or start a new one
                    </p>
                    <Button onClick={() => setShowNewMessage(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Message Modal */}
      <Modal
        isOpen={showNewMessage}
        onClose={() => {
          setShowNewMessage(false);
          setSearchUsers("");
        }}
        title="New Message"
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user.id)}
                    disabled={isStarting}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar
                      src={user.avatar_url || undefined}
                      fallback={user.full_name?.charAt(0) || "?"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.full_name}</p>
                        {getRoleBadge(user.role || "student")}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

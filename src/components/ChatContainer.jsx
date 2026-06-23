"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MemberList } from "./MemberList";
import { TypingIndicator } from "./TypingIndicator";
import { ConnectionStatus } from "./ConnectionStatus";

export function ChatContainer({ roomId, userId, userName }) {
  const {
    isConnected,
    messages,
    roomMembers,
    typingUsers,
    error,
    joinUser,
    joinRoom,
    sendMessage,
    getRoomMembers,
    getMessageHistory,
    setTyping,
  } = useSocket();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) return;

    setLoading(true);

    // Join as user
    joinUser(userId, userName);

    // Wait a bit for user to join, then join room
    const timer = setTimeout(() => {
      joinRoom(roomId, userId);
      getRoomMembers(roomId);
      getMessageHistory(roomId, 50, 0);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isConnected,
    roomId,
    userId,
    userName,
    joinUser,
    joinRoom,
    getRoomMembers,
    getMessageHistory,
  ]);

  const handleSendMessage = (text) => {
    sendMessage(text, roomId, userId);
  };

  const handleTyping = (isTyping) => {
    setTyping(roomId, userId, isTyping);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isConnected ? "Loading chat..." : "Connecting..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-md">
          <h1 className="text-2xl font-bold">Chat Room</h1>
          <p className="text-blue-100 text-sm">Room ID: {roomId}</p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus isConnected={isConnected} error={error} />

        {/* Messages */}
        <MessageList messages={messages} currentUserId={userId} />

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} currentUserId={userId} />

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          isConnected={isConnected}
        />
      </div>

      {/* Members Sidebar */}
      <MemberList members={roomMembers} currentUserId={userId} />
    </div>
  );
}

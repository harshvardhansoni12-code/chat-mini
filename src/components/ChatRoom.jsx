"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";

export function ChatRoom({ roomId, userId, userName }) {
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
    leaveRoom,
  } = useSocket();

  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) return;

    setLoading(true);

    // Join as user
    joinUser(userId, userName);

    // Wait a bit for user to join, then join room
    const timer = setTimeout(() => {
      joinRoom(roomId, userId);

      // Get room members and message history
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

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!messageText.trim()) return;

    sendMessage(messageText, roomId, userId);
    setMessageText("");
    setIsTyping(false);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      setTyping(roomId, userId, true);
    }

    // Clear typing after user stops typing
    clearTimeout(handleTyping.timeout);
    handleTyping.timeout = setTimeout(() => {
      setIsTyping(false);
      setTyping(roomId, userId, false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isConnected ? "Loading chat..." : "Connecting..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Chat Room</h2>
            <p className="text-sm text-gray-500">
              Connected: <span className="text-green-600">●</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{userName}</p>
            <p className="text-xs text-gray-500">
              {roomMembers.length} members
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Messages */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.userId === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.userId === userId
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm font-semibold">{msg.userName}</p>
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.userId === userId
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <p>
                  {typingUsers.map((u) => u.userName).join(", ")} is typing...
                </p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="border-t p-4 bg-gray-50 rounded-b-lg"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar - Room Members */}
        <div className="w-64 bg-white rounded-lg shadow p-4 hidden lg:block">
          <h3 className="font-bold text-gray-800 mb-4">
            Members ({roomMembers.length})
          </h3>
          <div className="space-y-2">
            {roomMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    member.isOnline ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;

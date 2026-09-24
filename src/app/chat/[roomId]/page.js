"use client";

import { use, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

const AVATAR_GRADIENTS = [
  "avatar-gradient-1",
  "avatar-gradient-2",
  "avatar-gradient-3",
  "avatar-gradient-4",
  "avatar-gradient-5",
  "avatar-gradient-6",
];

function getAvatarGradient(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) return true;
  const curr = new Date(messages[index].timestamp || messages[index].createdAt);
  const prev = new Date(
    messages[index - 1].timestamp || messages[index - 1].createdAt,
  );
  return curr.toDateString() !== prev.toDateString();
}

export default function ChatPage({ params }) {
  const { roomId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [roomData, setRoomData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const userId = session?.user?.id;
  const userName = session?.user?.name;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch room data via REST (initial load)
  useEffect(() => {
    if (status === "authenticated" && roomId) {
      fetchRoomData();
    }
  }, [status, roomId]);

  // Socket.IO connection
  useEffect(() => {
    if (status !== "authenticated" || !userId || !roomId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
      timeout: 5000,
      forceNew: false,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);

      socket.emit("user:join", { userId, userName });
      socket.emit("room:join", { roomId, userId });
      socket.emit("message:history:get", { roomId, limit: 100, offset: 0 });
      socket.emit("room:members:get", { roomId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("message:received", (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("message:history", (data) => {
      setMessages(data.messages || []);
    });

    socket.on("room:members:list", (data) => {
      setRoomData((prev) =>
        prev ? { ...prev, onlineMembers: data.members } : prev,
      );
    });

    socket.on("user:typing:status", (data) => {
      if (data.userId === userId) return;
      if (data.isTyping) {
        setTypingUsers((prev) => [
          ...prev.filter((u) => u.userId !== data.userId),
          { userId: data.userId, userName: data.userName },
        ]);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    socket.on("room:user:joined", (data) => {
      console.log("User joined:", data.userName);
    });

    socket.on("room:user:left", (data) => {
      console.log("User left:", data.userName);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.emit("room:leave", { roomId, userId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, userId, userName, roomId]);

  const fetchRoomData = async () => {
    try {
      const res = await fetch(`/api/rooms/get-room?roomId=${roomId}`);
      const data = await res.json();
      if (res.ok) {
        setRoomData(data.room);
      } else {
        setError(data.message || "Room not found");
      }
    } catch (err) {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = useCallback(
    (e) => {
      e.preventDefault();
      if (!messageText.trim() || !socketRef.current?.connected) return;

      socketRef.current.emit("message:send", {
        text: messageText.trim(),
        roomId,
        userId,
      });

      setMessageText("");

      if (isTypingRef.current) {
        socketRef.current.emit("user:typing", {
          roomId,
          userId,
          isTyping: false,
        });
        isTypingRef.current = false;
      }
    },
    [messageText, roomId, userId],
  );

  const handleTyping = useCallback(
    (e) => {
      setMessageText(e.target.value);

      if (!socketRef.current?.connected) return;

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        socketRef.current.emit("user:typing", {
          roomId,
          userId,
          isTyping: true,
        });
      }

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        socketRef.current?.emit("user:typing", {
          roomId,
          userId,
          isTyping: false,
        });
      }, 1500);
    },
    [roomId, userId],
  );

  // --- Render ---

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-gray-200 border-t-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm mx-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-gray-900 text-lg font-semibold mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/rooms")}
            className="px-6 py-2.5 rounded-xl btn-primary font-medium text-sm"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  const memberCount = roomData?._count?.member || roomData?.member?.length || 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="glass border-b border-gray-200/60 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/rooms")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Room Avatar */}
          <div
            className={`w-10 h-10 rounded-full ${getAvatarGradient(roomData?.roomname)} flex items-center justify-center shadow-sm`}
          >
            <span className="text-white text-sm font-semibold">
              {getInitials(roomData?.roomname)}
            </span>
          </div>

          <div>
            <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
              {roomData?.roomname || "Chat Room"}
            </h1>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <p className="text-xs text-gray-500">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
                {isConnected ? " · Online" : " · Connecting..."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 chat-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-[15px]">
              No messages yet
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Be the first to say something!
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-w-3xl mx-auto">
            {messages.map((msg, index) => {
              const isOwn = msg.userId === userId;
              const senderName = msg.userName || msg.user?.name || "Anonymous";
              const timestamp = msg.timestamp || msg.createdAt;
              const showDate = shouldShowDateSeparator(messages, index);

              // Check if this is the first message from this sender in a consecutive group
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showAvatar =
                !isOwn &&
                (!prevMsg || prevMsg.userId !== msg.userId || showDate);
              const showName = showAvatar;

              return (
                <div key={msg.id}>
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <div className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 font-medium shadow-sm border border-gray-100">
                        {formatDateSeparator(timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"} animate-message-in`}
                  >
                    {/* Avatar space for received messages */}
                    {!isOwn && (
                      <div className="w-8 mr-2 shrink-0 flex items-end">
                        {showAvatar && (
                          <div
                            className={`w-7 h-7 rounded-full ${getAvatarGradient(senderName)} flex items-center justify-center`}
                          >
                            <span className="text-white text-[10px] font-semibold">
                              {getInitials(senderName)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}
                    >
                      {/* Sender name */}
                      {showName && (
                        <p className="text-xs text-gray-500 mb-1 ml-1 font-medium">
                          {senderName}
                        </p>
                      )}

                      {/* Bubble */}
                      <div
                        className={`px-3.5 py-2 ${
                          isOwn
                            ? "bg-indigo-600 text-white rounded-2xl rounded-br-md"
                            : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-2xl rounded-bl-md"
                        }`}
                      >
                        <p className="break-words text-[14px] leading-relaxed">
                          {msg.text}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <p
                            className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}
                          >
                            {formatTime(timestamp)}
                          </p>
                          {/* Checkmarks for sent messages */}
                          {isOwn && (
                            <svg
                              className="w-3.5 h-3.5 text-indigo-200"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1.5 shrink-0 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
            <p className="text-xs text-gray-400">
              {typingUsers.map((u) => u.userName).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing
            </p>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="glass border-t border-gray-200/60 px-4 py-3 shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          {/* Attachment button */}
          <button
            type="button"
            className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={handleTyping}
              placeholder={
                isConnected ? "Type a message..." : "Connecting to server..."
              }
              disabled={!isConnected}
              className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-full px-4 py-2.5 focus:outline-none input-modern text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Send or Mic */}
          {messageText.trim() ? (
            <button
              type="submit"
              disabled={!isConnected || !messageText.trim()}
              className="p-2.5 btn-primary rounded-full disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="p-2.5 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

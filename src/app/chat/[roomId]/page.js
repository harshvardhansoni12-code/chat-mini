"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

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

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);

      // Join as user, then join room
      socket.emit("user:join", { userId, userName });
      socket.emit("room:join", { roomId, userId });

      // Load message history
      socket.emit("message:history:get", { roomId, limit: 100, offset: 0 });
      socket.emit("room:members:get", { roomId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("message:received", (message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("message:history", (data) => {
      setMessages(data.messages || []);
    });

    socket.on("room:members:list", (data) => {
      setRoomData((prev) => prev ? { ...prev, onlineMembers: data.members } : prev);
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

  const handleSend = useCallback((e) => {
    e.preventDefault();
    if (!messageText.trim() || !socketRef.current?.connected) return;

    socketRef.current.emit("message:send", {
      text: messageText.trim(),
      roomId,
      userId,
    });

    setMessageText("");

    // Stop typing indicator
    if (isTypingRef.current) {
      socketRef.current.emit("user:typing", { roomId, userId, isTyping: false });
      isTypingRef.current = false;
    }
  }, [messageText, roomId, userId]);

  const handleTyping = useCallback((e) => {
    setMessageText(e.target.value);

    if (!socketRef.current?.connected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.emit("user:typing", { roomId, userId, isTyping: true });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current?.emit("user:typing", { roomId, userId, isTyping: false });
    }, 1500);
  }, [roomId, userId]);

  // --- Render ---

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-semibold mb-2">Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button onClick={() => router.push("/rooms")} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition font-medium">
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  const memberCount = roomData?._count?.member || roomData?.member?.length || 0;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/rooms")} className="p-2 hover:bg-slate-700/50 rounded-xl transition text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">{roomData?.roomname || "Chat Room"}</h1>
            <p className="text-slate-400 text-xs">
              {memberCount} member{memberCount !== 1 ? "s" : ""} · Code: <span className="font-mono text-indigo-400">{roomData?.roomcode}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></div>
          <span className={`text-xs font-medium ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No messages yet</p>
            <p className="text-slate-600 text-sm mt-1">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === userId;
            const senderName = msg.userName || msg.user?.name || "Anonymous";
            const timestamp = msg.timestamp || msg.createdAt;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[70%]">
                  {!isOwn && (
                    <p className="text-xs text-slate-500 mb-1 ml-3 font-medium">{senderName}</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isOwn
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md"
                  }`}>
                    <p className="break-words text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-indigo-300" : "text-slate-500"}`}>
                      {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 shrink-0">
          <p className="text-xs text-slate-500 italic">
            {typingUsers.map((u) => u.userName).join(", ")}{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing...
          </p>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-slate-800/80 backdrop-blur-lg border-t border-slate-700/50 px-4 py-4 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={messageText}
            onChange={handleTyping}
            placeholder={isConnected ? "Type a message..." : "Connecting to server..."}
            disabled={!isConnected}
            className="flex-1 bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!isConnected || !messageText.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

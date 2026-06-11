"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
      setIsConnected(true);
      setError(null);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
      setError(error);
    });

    socketRef.current.on("message:received", (message) => {
      console.log("Message received:", message);
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on("room:user:joined", (data) => {
      console.log("User joined room:", data);
    });

    socketRef.current.on("room:user:left", (data) => {
      console.log("User left room:", data);
    });

    socketRef.current.on("room:members:list", (data) => {
      console.log("Room members:", data);
      setRoomMembers(data.members);
    });

    socketRef.current.on("message:history", (data) => {
      console.log("Message history:", data);
      setMessages(data.messages);
    });

    socketRef.current.on("user:typing:status", (data) => {
      console.log("User typing:", data);
      if (data.isTyping) {
        setTypingUsers((prev) => [
          ...prev.filter((u) => u.userId !== data.userId),
          { userId: data.userId, userName: data.userName },
        ]);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Join as user
  const joinUser = useCallback((userId, userName) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("user:join", { userId, userName });
    }
  }, [isConnected]);

  // Join room
  const joinRoom = useCallback((roomId, userId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("room:join", { roomId, userId });
    }
  }, [isConnected]);

  // Send message
  const sendMessage = useCallback((text, roomId, userId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("message:send", { text, roomId, userId });
    }
  }, [isConnected]);

  // Get room members
  const getRoomMembers = useCallback((roomId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("room:members:get", { roomId });
    }
  }, [isConnected]);

  // Get message history
  const getMessageHistory = useCallback((roomId, limit = 50, offset = 0) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("message:history:get", { roomId, limit, offset });
    }
  }, [isConnected]);

  // Emit typing indicator
  const setTyping = useCallback((roomId, userId, isTyping) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("user:typing", { roomId, userId, isTyping });
    }
  }, [isConnected]);

  // Leave room
  const leaveRoom = useCallback((roomId, userId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("room:leave", { roomId, userId });
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
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
  };
}

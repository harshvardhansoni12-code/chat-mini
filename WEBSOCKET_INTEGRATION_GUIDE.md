# WebSocket Integration Guide for Chat-Mini

**Complete Implementation Guide for Real-Time Chat with Next.js 16, Prisma & Socket.IO**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Installation & Setup](#installation--setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Integration with Existing API](#integration-with-existing-api)
7. [Best Practices & Optimization](#best-practices--optimization)
8. [Troubleshooting](#troubleshooting)
9. [Deployment Considerations](#deployment-considerations)

---

## Overview

WebSockets enable **real-time, bidirectional communication** between client and server, perfect for chat applications. This guide uses **Socket.IO**, which:

- ✅ Works seamlessly with Next.js
- ✅ Provides automatic fallbacks (HTTP polling, WebSocket)
- ✅ Includes built-in error handling and reconnection logic
- ✅ Supports room-based message broadcasting
- ✅ Scales well with multiple concurrent connections

**Use Case**: Users in a room can send/receive messages instantly without page refresh.

---

## Architecture & Technology Stack

### Current Setup

```
Frontend: React 19 + Next.js 16
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL
```

### WebSocket Addition

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                     │
│  - React Components                                     │
│  - Socket.IO Client Library                             │
│  - Message UI Components                                │
└──────────────────┬──────────────────────────────────────┘
                   │ (WebSocket)
                   ↓
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER                          │
│  - Socket.IO Server                                     │
│  - Room Management                                      │
│  - Message Broadcasting                                 │
│  - Authentication Middleware                            │
└──────────────────┬──────────────────────────────────────┘
                   │ (Prisma Client)
                   ↓
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                         │
│  - Persist Messages                                     │
│  - User/Room Data                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### Step 1: Install Dependencies

```bash
npm install socket.io socket.io-client
npm install --save-dev @types/node
```

**Package Versions**:

- `socket.io@^4.7.0` - Server library
- `socket.io-client@^4.7.0` - Client library

### Step 2: Create Socket Server Instance

Create a new file: `src/lib/socket.js`

```javascript
import { Server } from "socket.io";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// Store active socket connections
// Format: { roomId: [{ socketId, userId }, ...] }
const roomConnections = new Map();

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!userId || !token) {
        return next(new Error("Authentication failed"));
      }

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = userId;
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected: ${socket.id}`);

    // Join room event
    socket.on("join-room", async (roomId) => {
      try {
        // Validate user is member of room
        const member = await prisma.member.findFirst({
          where: {
            userId: socket.userId,
            roomId: roomId,
          },
        });

        if (!member) {
          socket.emit("error", { message: "Not a member of this room" });
          return;
        }

        socket.join(roomId);

        // Track connection
        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, []);
        }
        roomConnections.get(roomId).push({
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName,
        });

        // Broadcast user joined
        io.to(roomId).emit("user-joined", {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date(),
        });

        // Send list of active users in room
        const activeUsers = roomConnections.get(roomId);
        socket.emit("active-users", activeUsers);

        console.log(`User ${socket.userName} joined room ${roomId}`);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Send message event
    socket.on("send-message", async (data) => {
      try {
        const { roomId, text } = data;

        // Validate user is in room
        if (!socket.rooms.has(roomId)) {
          socket.emit("error", { message: "Not in room" });
          return;
        }

        // Get member
        const member = await prisma.member.findFirst({
          where: {
            userId: socket.userId,
            roomId: roomId,
          },
        });

        if (!member) {
          socket.emit("error", { message: "Not a member of this room" });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            text,
            roomId,
            userId: socket.userId,
            memberId: member.id,
          },
        });

        // Broadcast message to room
        io.to(roomId).emit("new-message", {
          id: message.id,
          text: message.text,
          userId: socket.userId,
          userName: socket.userName,
          createdAt: message.createdAt,
          roomId: roomId,
        });

        console.log(`Message sent in room ${roomId} by ${socket.userName}`);
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Update message event
    socket.on("update-message", async (data) => {
      try {
        const { messageId, text, roomId } = data;

        // Find message
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message || message.userId !== socket.userId) {
          socket.emit("error", { message: "Cannot update message" });
          return;
        }

        // Update message
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { text },
        });

        // Broadcast update
        io.to(roomId).emit("message-updated", {
          id: updated.id,
          text: updated.text,
          updatedAt: new Date(),
        });

        console.log(`Message ${messageId} updated`);
      } catch (error) {
        console.error("Update message error:", error);
        socket.emit("error", { message: "Failed to update message" });
      }
    });

    // Delete message event
    socket.on("delete-message", async (data) => {
      try {
        const { messageId, roomId } = data;

        // Find message
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message || message.userId !== socket.userId) {
          socket.emit("error", { message: "Cannot delete message" });
          return;
        }

        // Delete message
        await prisma.message.delete({
          where: { id: messageId },
        });

        // Broadcast deletion
        io.to(roomId).emit("message-deleted", {
          id: messageId,
        });

        console.log(`Message ${messageId} deleted`);
      } catch (error) {
        console.error("Delete message error:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Typing indicator
    socket.on("user-typing", (data) => {
      const { roomId } = data;
      socket.to(roomId).emit("user-typing", {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // Stop typing
    socket.on("user-stop-typing", (data) => {
      const { roomId } = data;
      socket.to(roomId).emit("user-stop-typing", {
        userId: socket.userId,
      });
    });

    // Leave room event
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);

      // Remove from tracking
      const connections = roomConnections.get(roomId);
      if (connections) {
        const index = connections.findIndex((c) => c.socketId === socket.id);
        if (index > -1) {
          connections.splice(index, 1);
        }
      }

      // Broadcast user left
      io.to(roomId).emit("user-left", {
        userId: socket.userId,
        userName: socket.userName,
      });

      console.log(`User ${socket.userName} left room ${roomId}`);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      // Remove from all rooms
      roomConnections.forEach((connections, roomId) => {
        const index = connections.findIndex((c) => c.socketId === socket.id);
        if (index > -1) {
          connections.splice(index, 1);
          io.to(roomId).emit("user-left", {
            userId: socket.userId,
            userName: socket.userName,
          });
        }
      });

      console.log(`User ${socket.userId} disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default initializeSocket;
```

### Step 3: Create Custom Server File

Create: `server.js` (in project root)

```javascript
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./src/lib/socket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request", err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const io = initializeSocket(httpServer);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log("> WebSocket Server Initialized");
    });
});
```

### Step 4: Update package.json Scripts

Modify your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js",
    "lint": "eslint"
  }
}
```

---

## Backend Implementation

### Integration with Existing Message Routes

Your existing REST API routes can now coexist with WebSocket events. Here's how to maintain both:

#### Update: `src/app/api/message/send-message/route.js`

```javascript
import { PrismaClient } from "../../../../generated/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { roomId, text } = await request.json();

    if (!roomId || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 },
      );
    }

    // Verify user is member
    const member = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        roomId: roomId,
      },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "Not a member of this room" }),
        { status: 403 },
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        text,
        roomId,
        userId: session.user.id,
        memberId: member.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return new Response(JSON.stringify(message), { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
```

#### Update: `src/app/api/message/get-message/route.js`

```javascript
import { PrismaClient } from "../../../../generated/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = parseInt(searchParams.get("skip")) || 0;

    if (!roomId) {
      return new Response(JSON.stringify({ error: "roomId is required" }), {
        status: 400,
      });
    }

    // Verify membership
    const member = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        roomId: roomId,
      },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "Not a member of this room" }),
        { status: 403 },
      );
    }

    const messages = await prisma.message.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });

    return new Response(JSON.stringify(messages), { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
```

---

## Frontend Implementation

### Step 1: Create Socket Context

Create: `src/lib/socketContext.jsx`

```javascript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import io from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket connection
    const socketInstance = io({
      auth: {
        token: session?.user?.token,
        userId: session?.user?.id,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socketInstance.on("error", (errorMessage) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage?.message || "Connection error");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError(error?.message || "Failed to connect");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
```

### Step 2: Update Provider Component

Update: `src/app/provider.jsx`

```javascript
"use client";

import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/lib/socketContext";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <SocketProvider>{children}</SocketProvider>
    </SessionProvider>
  );
}
```

### Step 3: Create Chat Component

Create: `src/components/chat/ChatRoom.jsx`

```javascript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/lib/socketContext";
import { useSession } from "next-auth/react";

export function ChatRoom({ roomId }) {
  const { socket, isConnected } = useSocket();
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/message/get-message?roomId=${roomId}&limit=50`,
        );
        const data = await response.json();
        setMessages(data.reverse());
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [roomId]);

  // Join room on socket connection
  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    socket.emit("join-room", roomId);

    return () => {
      socket.emit("leave-room", roomId);
    };
  }, [socket, isConnected, roomId]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("active-users", (users) => {
      setActiveUsers(users);
    });

    socket.on("user-joined", (data) => {
      setActiveUsers((prev) => [
        ...prev,
        { userId: data.userId, userName: data.userName },
      ]);
    });

    socket.on("user-left", (data) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    socket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
      setTypingUsers((prev) => {
        prev.delete(message.userId);
        return new Set(prev);
      });
    });

    socket.on("message-updated", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, text: data.text } : msg,
        ),
      );
    });

    socket.on("message-deleted", (data) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
    });

    socket.on("user-typing", (data) => {
      setTypingUsers((prev) => new Set(prev).add(data.userId));
    });

    socket.on("user-stop-typing", (data) => {
      setTypingUsers((prev) => {
        prev.delete(data.userId);
        return new Set(prev);
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return () => {
      socket.off("active-users");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("new-message");
      socket.off("message-updated");
      socket.off("message-deleted");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("error");
    };
  }, [socket]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing
  const handleInput = useCallback(
    (e) => {
      setInputValue(e.target.value);

      if (!socket || !isConnected) return;

      socket.emit("user-typing", { roomId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("user-stop-typing", { roomId });
      }, 3000);
    },
    [socket, isConnected, roomId],
  );

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !socket || !isConnected) return;

    socket.emit("send-message", {
      roomId,
      text: inputValue.trim(),
    });

    setInputValue("");
    socket.emit("user-stop-typing", { roomId });
  }, [inputValue, socket, isConnected, roomId]);

  // Delete message
  const handleDeleteMessage = useCallback(
    (messageId) => {
      if (!socket || !isConnected) return;
      socket.emit("delete-message", { messageId, roomId });
    },
    [socket, isConnected, roomId],
  );

  // Update message
  const handleUpdateMessage = useCallback(
    (messageId, newText) => {
      if (!socket || !isConnected) return;
      socket.emit("update-message", { messageId, text: newText, roomId });
    },
    [socket, isConnected, roomId],
  );

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <p className="text-sm">
          Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
        <p className="text-sm">Active Users: {activeUsers.length}</p>
      </div>

      {/* Active Users */}
      <div className="bg-gray-100 p-2 text-sm">
        <strong>Users Online:</strong>{" "}
        {activeUsers.map((u) => u.userName).join(", ")}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="bg-white rounded p-3 shadow">
            <div className="flex justify-between">
              <strong>{message.userName}</strong>
              <small className="text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </small>
            </div>
            <p className="text-gray-800">{message.text}</p>
            {message.userId === session?.user?.id && (
              <div className="mt-2 space-x-2">
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="text-gray-500 italic text-sm">
            {Array.from(typingUsers).length} user(s) typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInput}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Use Chat Component in Page

Update or create: `src/app/room/[id]/page.js`

```javascript
"use client";

import { ChatRoom } from "@/components/chat/ChatRoom";
import { useParams } from "next/navigation";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id;

  return (
    <div>
      <ChatRoom roomId={roomId} />
    </div>
  );
}
```

---

## Integration with Existing API

### REST API vs WebSocket Strategy

| Operation          | Method               | Use Case                |
| ------------------ | -------------------- | ----------------------- |
| **Send Message**   | WebSocket            | Real-time delivery      |
| **Update Message** | WebSocket            | Instant broadcast       |
| **Delete Message** | WebSocket            | Instant broadcast       |
| **Get Messages**   | REST API             | Load initial history    |
| **Create Room**    | REST API             | One-time setup          |
| **Join Room**      | REST API + WebSocket | Validation + connection |
| **List Rooms**     | REST API             | Initial load            |

### Hybrid Approach Benefits

1. **WebSocket** for low-latency, real-time operations
2. **REST API** for non-urgent, transactional operations
3. **Fallback** if WebSocket fails, REST API still works

---

## Best Practices & Optimization

### 1. Message Persistence

Always save to database before broadcasting:

```javascript
socket.on("send-message", async (data) => {
  const message = await prisma.message.create({ data }); // ← DB first
  io.to(roomId).emit("new-message", message); // ← Then broadcast
});
```

### 2. Error Handling

Always include error listeners:

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Show user-friendly error message
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  // Attempt reconnection (handled automatically)
});
```

### 3. Authentication Middleware

Validate on connection:

```javascript
io.use(async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return next(new Error("Invalid user"));
  next();
});
```

### 4. Memory Management

Clean up on disconnect:

```javascript
socket.on("disconnect", () => {
  // Remove from room tracking
  // Clean up event listeners
  // Update user status in DB
});
```

### 5. Scaling Considerations

For multiple server instances:

```javascript
// Use Redis adapter for Socket.IO
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 6. Performance Optimization

- **Limit message history**: Load only recent messages
- **Batch updates**: Debounce rapid changes
- **Compression**: Enable automatic compression
- **Message throttling**: Limit message frequency per user

---

## Troubleshooting

### Issue: Connection Refused

**Symptom**: Client cannot connect to server

**Solution**:

```javascript
// Check server is running on correct port
// Verify CORS settings in socket.js
// Check firewall settings
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true,
  },
});
```

### Issue: Messages Not Appearing

**Symptom**: WebSocket sends message but doesn't appear

**Solution**:

1. Check Prisma connection
2. Verify user is member of room
3. Check console for errors
4. Verify database constraints

```javascript
// Add debug logging
socket.on("send-message", async (data) => {
  console.log("Received message:", data);
  console.log("User:", socket.userId);
  console.log("Room:", data.roomId);
  // ...
});
```

### Issue: High Memory Usage

**Symptom**: Server memory grows over time

**Solution**:

```javascript
// Remove old messages periodically
await prisma.message.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  },
});
```

### Issue: Frequent Disconnections

**Symptom**: Users get disconnected frequently

**Solution**:

```javascript
// Add keepalive and increase timeout
const io = new Server(httpServer, {
  pingInterval: 25000,
  pingTimeout: 60000,
  transports: ["websocket", "polling"],
});
```

---

## Deployment Considerations

### Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chat-mini

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key

# Socket.IO
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Production Setup

#### Option 1: Vercel (Limited WebSocket Support)

For Vercel, use HTTP polling:

```javascript
const io = new Server(httpServer, {
  transports: ["polling"], // Polling only on Vercel
});
```

#### Option 2: Self-Hosted (Full WebSocket)

1. Use Node.js server directly (not serverless)
2. Deploy with PM2 or Docker
3. Use Redis for multi-instance deployments

**Docker Compose Example**:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chat_mini
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/chat_mini
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

### SSL/TLS for WebSocket

Ensure secure WebSocket connection (wss://):

```javascript
const https = require("https");
const fs = require("fs");

const httpsServer = https.createServer(
  {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  },
  app,
);

const io = initializeSocket(httpsServer);
```

---

## Testing

### Manual Testing Checklist

- [ ] Can connect to room
- [ ] Can send messages
- [ ] Messages appear in real-time
- [ ] Can see other users typing
- [ ] Can delete own messages
- [ ] Can update own messages
- [ ] Disconnection handled gracefully
- [ ] Reconnection works
- [ ] Works on multiple browser tabs
- [ ] Works on different devices (mobile)

### Unit Test Example

```javascript
// tests/socket.test.js
import { io as ioClient } from "socket.io-client";
import { initializeSocket } from "../src/lib/socket";

describe("Socket.IO", () => {
  let socket;
  let httpServer;

  beforeEach((done) => {
    httpServer = require("http").createServer();
    initializeSocket(httpServer);
    httpServer.listen(3001);

    socket = ioClient("http://localhost:3001", {
      auth: { userId: "test-user" },
    });

    socket.on("connect", done);
  });

  afterEach(() => {
    socket.disconnect();
    httpServer.close();
  });

  it("should connect successfully", (done) => {
    expect(socket.connected).toBe(true);
    done();
  });

  it("should join room", (done) => {
    socket.emit("join-room", "test-room", () => {
      expect(socket.rooms.has("test-room")).toBe(true);
      done();
    });
  });
});
```

---

## Next Steps

1. **Install dependencies**: Run `npm install socket.io socket.io-client`
2. **Create server.js**: Add the custom server file
3. **Create socket.js**: Add the socket initialization
4. **Update package.json**: Change dev script
5. **Create SocketProvider**: Add socket context
6. **Create ChatRoom Component**: Build UI component
7. **Test locally**: Run `npm run dev`
8. **Deploy**: Follow deployment section

---

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Socket.IO with Next.js](https://socket.io/docs/v4/server-installation/#nodejs-http-server)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [NextAuth.js](https://next-auth.js.org/)
- [Real-Time Applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## Support & Debugging

**Enable Debug Logs**:

```bash
DEBUG=socket.io* npm run dev
```

**Check Socket Connection**:

```javascript
// In browser console
io = io.connect();
io.on("connect", () => console.log("Connected"));
io.on("error", (err) => console.error("Error:", err));
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-05  
**Compatibility**: Next.js 16+, React 19+, Node.js 18+

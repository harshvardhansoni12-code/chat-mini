// Custom server for Next.js + Socket.IO
// This file runs through tsx to support TypeScript imports from the generated Prisma client.
// Usage: npx tsx server.mjs

import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3001", 10);

// ── Prisma ────────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── Next.js ───────────────────────────────────────────────
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // ── Socket.IO ─────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || `http://${hostname}:${port}`,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 10000,
    connectTimeout: 10000,
  });

  // In-memory tracking
  const connectedUsers = new Map();
  const roomMembers = new Map();

  // Expose globally so API routes could access if needed
  globalThis.__socketIO = io;
  globalThis.__connectedUsers = connectedUsers;
  globalThis.__roomMembers = roomMembers;

  io.on("connection", (socket) => {
    console.log("⚡ Client connected:", socket.id);

    // ── user:join ───────────────────────────────────
    socket.on("user:join", (data) => {
      const { userId, userName } = data;
      if (!userId) {
        socket.emit("error", { message: "userId is required" });
        return;
      }
      connectedUsers.set(userId, {
        socketId: socket.id,
        userName,
        connectedAt: new Date(),
      });
      socket.userId = userId;
      socket.userName = userName;
      socket.emit("user:joined", { success: true, userId, message: "User joined successfully" });
      console.log(`  └─ User ${userName || userId} registered`);
    });

    // ── room:join ───────────────────────────────────
    socket.on("room:join", async (data) => {
      try {
        const { roomId, userId } = data;
        if (!roomId || !userId) {
          socket.emit("error", { message: "roomId and userId are required" });
          return;
        }
        const member = await prisma.member.findFirst({ where: { roomId, userId } });
        if (!member) {
          socket.emit("error", { message: "User is not a member of this room" });
          return;
        }
        socket.join(`room:${roomId}`);
        socket.roomId = roomId;
        if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set());
        roomMembers.get(roomId).add(userId);
        io.to(`room:${roomId}`).emit("room:user:joined", {
          userId, userName: socket.userName, timestamp: new Date(),
        });
        console.log(`  └─ User ${socket.userName || userId} joined room ${roomId}`);
      } catch (error) {
        console.error("Error in room:join:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── message:send ────────────────────────────────
    socket.on("message:send", async (data) => {
      try {
        const { text, roomId, userId } = data;
        if (!text || !roomId || !userId) {
          socket.emit("error", { message: "text, roomId, and userId are required" });
          return;
        }
        const member = await prisma.member.findFirst({ where: { roomId, userId } });
        if (!member) {
          socket.emit("error", { message: "User is not a member of this room" });
          return;
        }
        const message = await prisma.message.create({
          data: { text, roomId, userId, memberId: member.id },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
        io.to(`room:${roomId}`).emit("message:received", {
          id: message.id,
          text: message.text,
          userId: message.userId,
          userName: message.user?.name || "Anonymous",
          userEmail: message.user?.email,
          roomId: message.roomId,
          timestamp: message.createdAt,
        });
        socket.emit("message:sent", { success: true, messageId: message.id });
      } catch (error) {
        console.error("Error in message:send:", error);
        socket.emit("error", { message: "Failed to send message", error: error.message });
      }
    });

    // ── room:members:get ────────────────────────────
    socket.on("room:members:get", async (data) => {
      try {
        const { roomId } = data;
        if (!roomId) { socket.emit("error", { message: "roomId is required" }); return; }
        const members = await prisma.member.findMany({
          where: { roomId }, include: { user: true },
        });
        const memberList = members.map((m) => ({
          id: m.user.id,
          name: m.user.name || "Anonymous",
          email: m.user.email,
          isOnline: connectedUsers.has(m.user.id),
        }));
        socket.emit("room:members:list", { members: memberList });
      } catch (error) {
        console.error("Error in room:members:get:", error);
        socket.emit("error", { message: "Failed to get room members" });
      }
    });

    // ── message:history:get ─────────────────────────
    socket.on("message:history:get", async (data) => {
      try {
        const { roomId, limit = 50, offset = 0 } = data;
        if (!roomId) { socket.emit("error", { message: "roomId is required" }); return; }
        const messages = await prisma.message.findMany({
          where: { roomId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });
        const messageList = messages.reverse().map((m) => ({
          id: m.id, text: m.text, userId: m.userId,
          userName: m.user.name || "Anonymous",
          userEmail: m.user.email, roomId: m.roomId,
          timestamp: m.createdAt,
        }));
        socket.emit("message:history", { messages: messageList });
      } catch (error) {
        console.error("Error in message:history:get:", error);
        socket.emit("error", { message: "Failed to get message history" });
      }
    });

    // ── user:typing ─────────────────────────────────
    socket.on("user:typing", (data) => {
      const { roomId, userId, isTyping } = data;
      if (!roomId || !userId) return;
      io.to(`room:${roomId}`).emit("user:typing:status", {
        userId, userName: socket.userName, isTyping, timestamp: new Date(),
      });
    });

    // ── room:leave ──────────────────────────────────
    socket.on("room:leave", (data) => {
      const { roomId, userId } = data;
      if (roomId && userId) {
        socket.leave(`room:${roomId}`);
        if (roomMembers.has(roomId)) roomMembers.get(roomId).delete(userId);
        io.to(`room:${roomId}`).emit("room:user:left", {
          userId, userName: socket.userName, timestamp: new Date(),
        });
      }
    });

    // ── disconnect ──────────────────────────────────
    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (userId) {
        connectedUsers.delete(userId);
        if (socket.roomId) {
          const roomId = socket.roomId;
          if (roomMembers.has(roomId)) roomMembers.get(roomId).delete(userId);
          io.to(`room:${roomId}`).emit("room:user:left", {
            userId, userName: socket.userName, timestamp: new Date(),
          });
        }
        console.log(`  └─ User ${socket.userName || userId} disconnected`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`\ Ready on http://${hostname}:${port}`);
    console.log(`Socket.IO server initialized\n`);
  });
});

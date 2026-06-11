import { Server } from "socket.io";
import prisma from "@/lib/prisma";

let io = null;
const connectedUsers = new Map(); // userId -> socket info
const roomMembers = new Map(); // roomId -> Set of userIds

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // User joins (authenticate and store connection)
    socket.on("user:join", async (data) => {
      try {
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

        socket.emit("user:joined", {
          success: true,
          userId,
          message: "User joined successfully",
        });

        console.log(`User ${userId} connected with socket ${socket.id}`);
      } catch (error) {
        console.error("Error in user:join:", error);
        socket.emit("error", { message: "Failed to join" });
      }
    });

    // User joins a room
    socket.on("room:join", async (data) => {
      try {
        const { roomId, userId } = data;

        if (!roomId || !userId) {
          socket.emit("error", { message: "roomId and userId are required" });
          return;
        }

        // Verify user is member of room
        const member = await prisma.member.findFirst({
          where: {
            userId,
            roomId,
          },
        });

        if (!member) {
          socket.emit("error", { message: "User is not a member of this room" });
          return;
        }

        socket.join(`room:${roomId}`);
        socket.roomId = roomId;

        // Track room members
        if (!roomMembers.has(roomId)) {
          roomMembers.set(roomId, new Set());
        }
        roomMembers.get(roomId).add(userId);

        // Notify room of user joining
        io.to(`room:${roomId}`).emit("room:user:joined", {
          userId,
          userName: socket.userName,
          timestamp: new Date(),
        });

        console.log(`User ${userId} joined room ${roomId}`);
      } catch (error) {
        console.error("Error in room:join:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Send message to room
    socket.on("message:send", async (data) => {
      try {
        const { text, roomId, userId } = data;

        if (!text || !roomId || !userId) {
          socket.emit("error", { message: "text, roomId, and userId are required" });
          return;
        }

        // Verify user is in the room
        const member = await prisma.member.findFirst({
          where: {
            userId,
            roomId,
          },
        });

        if (!member) {
          socket.emit("error", { message: "User is not a member of this room" });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            text,
            roomId,
            userId,
            memberId: member.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Broadcast to room
        io.to(`room:${roomId}`).emit("message:received", {
          id: message.id,
          text: message.text,
          userId: message.userId,
          userName: message.user.name || "Anonymous",
          userEmail: message.user.email,
          roomId: message.roomId,
          timestamp: message.createdAt,
        });

        socket.emit("message:sent", { success: true, messageId: message.id });
        console.log(`Message sent in room ${roomId} by user ${userId}`);
      } catch (error) {
        console.error("Error in message:send:", error);
        socket.emit("error", { message: "Failed to send message", error: error.message });
      }
    });

    // Get room members
    socket.on("room:members:get", async (data) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          socket.emit("error", { message: "roomId is required" });
          return;
        }

        const members = await prisma.member.findMany({
          where: {
            roomId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        const memberList = members.map((m) => ({
          id: m.user.id,
          name: m.user.name || "Anonymous",
          email: m.user.email,
          isOnline: connectedUsers.has(m.user.id),
        }));

        socket.emit("room:members:list", { members: memberList });
        console.log(`Room ${roomId} members retrieved`);
      } catch (error) {
        console.error("Error in room:members:get:", error);
        socket.emit("error", { message: "Failed to get room members" });
      }
    });

    // Get message history
    socket.on("message:history:get", async (data) => {
      try {
        const { roomId, limit = 50, offset = 0 } = data;

        if (!roomId) {
          socket.emit("error", { message: "roomId is required" });
          return;
        }

        const messages = await prisma.message.findMany({
          where: {
            roomId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          skip: offset,
        });

        const messageList = messages
          .reverse()
          .map((m) => ({
            id: m.id,
            text: m.text,
            userId: m.userId,
            userName: m.user.name || "Anonymous",
            userEmail: m.user.email,
            roomId: m.roomId,
            timestamp: m.createdAt,
          }));

        socket.emit("message:history", { messages: messageList });
        console.log(`Message history retrieved for room ${roomId}`);
      } catch (error) {
        console.error("Error in message:history:get:", error);
        socket.emit("error", { message: "Failed to get message history" });
      }
    });

    // Typing indicator
    socket.on("user:typing", (data) => {
      try {
        const { roomId, userId, isTyping } = data;

        if (!roomId || !userId) return;

        io.to(`room:${roomId}`).emit("user:typing:status", {
          userId,
          userName: socket.userName,
          isTyping,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error in user:typing:", error);
      }
    });

    // User leaves room
    socket.on("room:leave", (data) => {
      try {
        const { roomId, userId } = data;

        if (roomId && userId) {
          socket.leave(`room:${roomId}`);

          if (roomMembers.has(roomId)) {
            roomMembers.get(roomId).delete(userId);
          }

          io.to(`room:${roomId}`).emit("room:user:left", {
            userId,
            userName: socket.userName,
            timestamp: new Date(),
          });

          console.log(`User ${userId} left room ${roomId}`);
        }
      } catch (error) {
        console.error("Error in room:leave:", error);
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      try {
        const userId = socket.userId;

        if (userId) {
          connectedUsers.delete(userId);

          // Notify all rooms user was in
          if (socket.roomId) {
            const roomId = socket.roomId;
            if (roomMembers.has(roomId)) {
              roomMembers.get(roomId).delete(userId);
            }

            io.to(`room:${roomId}`).emit("room:user:left", {
              userId,
              userName: socket.userName,
              timestamp: new Date(),
            });
          }

          console.log(`User ${userId} disconnected`);
        }
      } catch (error) {
        console.error("Error in disconnect:", error);
      }
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export function getConnectedUsers() {
  return Array.from(connectedUsers.entries()).map(([userId, info]) => ({
    userId,
    ...info,
  }));
}

export function getRoomMembers(roomId) {
  return Array.from(roomMembers.get(roomId) || new Set());
}

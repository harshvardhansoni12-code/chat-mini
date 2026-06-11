import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Server } from "socket.io";
import { createServer } from "http";
import { Client as ioClient } from "socket.io-client";
import {
  initializeSocket,
  getConnectedUsers,
  getRoomMembers,
} from "@/lib/socketService";
import prisma from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Socket.IO Server Logic", () => {
  let httpServer;
  let io;
  let client1;
  let client2;

  const socketUrl = "http://localhost:3001";

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize Socket.IO
    io = initializeSocket(httpServer);

    // Start server
    httpServer.listen(3001, () => {
      console.log("Test server started on port 3001");
      done();
    });
  });

  afterAll(() => {
    // Close server and sockets
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    httpServer.close();
  });

  describe("User Connection", () => {
    it("should allow user to join", (done) => {
      client1 = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      client1.on("connect", () => {
        client1.emit("user:join", {
          userId: "user-1",
          userName: "User One",
        });

        client1.on("user:joined", (data) => {
          expect(data.success).toBe(true);
          expect(data.userId).toBe("user-1");
          expect(data.message).toBe("User joined successfully");
          done();
        });
      });

      client1.on("error", (error) => {
        done(error);
      });
    });

    it("should reject user:join without userId", (done) => {
      const testClient = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      testClient.on("connect", () => {
        testClient.emit("user:join", { userName: "Test User" });

        testClient.on("error", (error) => {
          expect(error.message).toBe("userId is required");
          testClient.disconnect();
          done();
        });
      });
    });

    it("should track connected users", (done) => {
      client2 = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      client2.on("connect", () => {
        client2.emit("user:join", {
          userId: "user-2",
          userName: "User Two",
        });

        client2.on("user:joined", () => {
          setTimeout(() => {
            const connectedUsers = getConnectedUsers();
            expect(connectedUsers.length).toBeGreaterThanOrEqual(1);
            expect(connectedUsers.some((u) => u.userId === "user-2")).toBe(
              true,
            );
            done();
          }, 100);
        });
      });
    });
  });

  describe("Room Operations", () => {
    it("should allow user to join room if member exists", (done) => {
      // Mock member exists
      prisma.member.findFirst.mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        roomId: "room-1",
      });

      if (client1?.connected) {
        client1.emit("room:join", {
          roomId: "room-1",
          userId: "user-1",
        });

        client1.on("room:user:joined", () => {
          expect(getRoomMembers("room-1")).toContain("user-1");
          done();
        });
      }
    });

    it("should reject room:join for non-members", (done) => {
      // Mock member doesn't exist
      prisma.member.findFirst.mockResolvedValueOnce(null);

      const testClient = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      testClient.on("connect", () => {
        testClient.emit("user:join", {
          userId: "user-3",
          userName: "User Three",
        });

        testClient.on("user:joined", () => {
          testClient.emit("room:join", {
            roomId: "room-1",
            userId: "user-3",
          });

          testClient.on("error", (error) => {
            expect(error.message).toBe("User is not a member of this room");
            testClient.disconnect();
            done();
          });
        });
      });
    });

    it("should track room members", (done) => {
      prisma.member.findFirst.mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        roomId: "room-1",
      });

      if (client1?.connected) {
        setTimeout(() => {
          const members = getRoomMembers("room-1");
          expect(Array.isArray(members)).toBe(true);
          done();
        }, 100);
      }
    });
  });

  describe("Message Operations", () => {
    it("should send message to room", (done) => {
      prisma.member.findFirst.mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        roomId: "room-1",
      });

      prisma.message.create.mockResolvedValueOnce({
        id: "msg-1",
        text: "Hello room",
        roomId: "room-1",
        userId: "user-1",
        createdAt: new Date(),
        user: {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
        },
      });

      if (client1?.connected) {
        client1.emit("message:send", {
          text: "Hello room",
          roomId: "room-1",
          userId: "user-1",
        });

        client1.on("message:sent", (data) => {
          expect(data.success).toBe(true);
          expect(data.messageId).toBe("msg-1");
          done();
        });
      }
    });

    it("should broadcast message to room members", (done) => {
      prisma.member.findFirst.mockResolvedValueOnce({
        id: "member-1",
        userId: "user-1",
        roomId: "room-1",
      });

      prisma.message.create.mockResolvedValueOnce({
        id: "msg-2",
        text: "Hello again",
        roomId: "room-1",
        userId: "user-1",
        createdAt: new Date(),
        user: {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
        },
      });

      const receiver = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      receiver.on("connect", () => {
        receiver.emit("user:join", {
          userId: "user-4",
          userName: "User Four",
        });

        receiver.on("user:joined", () => {
          if (client1?.connected) {
            client1.emit("message:send", {
              text: "Hello again",
              roomId: "room-1",
              userId: "user-1",
            });
          }
        });

        receiver.on("message:received", (message) => {
          expect(message.text).toBe("Hello again");
          expect(message.userId).toBe("user-1");
          receiver.disconnect();
          done();
        });
      });
    });

    it("should reject message from non-members", (done) => {
      prisma.member.findFirst.mockResolvedValueOnce(null);

      const testClient = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      testClient.on("connect", () => {
        testClient.emit("user:join", {
          userId: "user-5",
          userName: "User Five",
        });

        testClient.on("user:joined", () => {
          testClient.emit("message:send", {
            text: "Test message",
            roomId: "room-1",
            userId: "user-5",
          });

          testClient.on("error", (error) => {
            expect(error.message).toBe("User is not a member of this room");
            testClient.disconnect();
            done();
          });
        });
      });
    });
  });

  describe("Room Members", () => {
    it("should get room members list", (done) => {
      prisma.member.findMany.mockResolvedValueOnce([
        {
          id: "member-1",
          userId: "user-1",
          roomId: "room-1",
          user: {
            id: "user-1",
            name: "User One",
            email: "user1@example.com",
          },
        },
        {
          id: "member-2",
          userId: "user-2",
          roomId: "room-1",
          user: {
            id: "user-2",
            name: "User Two",
            email: "user2@example.com",
          },
        },
      ]);

      if (client1?.connected) {
        client1.emit("room:members:get", { roomId: "room-1" });

        client1.on("room:members:list", (data) => {
          expect(Array.isArray(data.members)).toBe(true);
          expect(data.members.length).toBe(2);
          expect(data.members[0].id).toBe("user-1");
          done();
        });
      }
    });
  });

  describe("Message History", () => {
    it("should retrieve message history", (done) => {
      prisma.message.findMany.mockResolvedValueOnce([
        {
          id: "msg-1",
          text: "First message",
          roomId: "room-1",
          userId: "user-1",
          createdAt: new Date(),
          user: {
            id: "user-1",
            name: "User One",
            email: "user1@example.com",
          },
        },
      ]);

      if (client1?.connected) {
        client1.emit("message:history:get", {
          roomId: "room-1",
          limit: 50,
          offset: 0,
        });

        client1.on("message:history", (data) => {
          expect(Array.isArray(data.messages)).toBe(true);
          expect(data.messages.length).toBeGreaterThan(0);
          done();
        });
      }
    });
  });

  describe("Typing Indicator", () => {
    it("should emit typing status", (done) => {
      const typer = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      typer.on("connect", () => {
        typer.emit("user:join", {
          userId: "user-6",
          userName: "User Six",
        });

        typer.on("user:joined", () => {
          typer.emit("user:typing", {
            roomId: "room-1",
            userId: "user-6",
            isTyping: true,
          });

          setTimeout(() => {
            typer.disconnect();
            done();
          }, 50);
        });
      });
    });
  });

  describe("Disconnection", () => {
    it("should handle user disconnect", (done) => {
      const tempClient = ioClient(socketUrl, {
        reconnection: false,
        transports: ["websocket"],
      });

      tempClient.on("connect", () => {
        tempClient.emit("user:join", {
          userId: "user-7",
          userName: "User Seven",
        });

        tempClient.on("user:joined", () => {
          tempClient.disconnect();

          setTimeout(() => {
            const connectedUsers = getConnectedUsers();
            const userExists = connectedUsers.some(
              (u) => u.userId === "user-7",
            );
            expect(userExists).toBe(false);
            done();
          }, 100);
        });
      });
    });
  });
});

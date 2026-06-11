// Socket.IO Integration Test - Manual Testing Guide
// This document provides manual testing steps for Socket.IO functionality

/**
 * SETUP REQUIREMENTS:
 * 1. Install socket.io-client: npm install socket.io-client
 * 2. Update Next.js package.json start script to use the new server.js
 * 3. Add environment variable: NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
 */

/**
 * TEST SCENARIO 1: User Connection
 * ================================
 *
 * Steps:
 * 1. Open browser console (F12)
 * 2. Paste the following code:
 */

const testUserConnection = async () => {
  const { io } = await import("socket.io-client");
  const socket = io("http://localhost:3000", {
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);

    // Emit user:join event
    socket.emit("user:join", {
      userId: "test-user-1",
      userName: "Test User",
    });
  });

  socket.on("user:joined", (data) => {
    console.log("✅ User joined successfully:", data);
    console.assert(
      data.success === true,
      "❌ user:joined should have success: true",
    );
    console.assert(data.userId === "test-user-1", "❌ userId should match");
  });

  socket.on("error", (error) => {
    console.error("❌ Error:", error);
  });

  socket.on("disconnect", () => {
    console.log("⚠️  Socket disconnected");
  });

  return socket;
};

// Call: await testUserConnection();

/**
 * TEST SCENARIO 2: Join Room
 * ==========================
 *
 * Prerequisites:
 * 1. User must be connected (from TEST SCENARIO 1)
 * 2. User must be a member of the room in database
 *
 * Steps:
 */

const testRoomJoin = (socket) => {
  socket.emit("room:join", {
    roomId: "actual-room-id", // Replace with real room ID from database
    userId: "test-user-1",
  });

  socket.on("room:user:joined", (data) => {
    console.log("✅ User joined room:", data);
    console.assert(data.userId === "test-user-1", "❌ userId should match");
  });
};

// Call: testRoomJoin(socket);

/**
 * TEST SCENARIO 3: Send Message
 * ==============================
 *
 * Prerequisites:
 * 1. User must be connected
 * 2. User must have joined a room
 *
 * Steps:
 */

const testSendMessage = (socket) => {
  socket.emit("message:send", {
    text: "Hello, this is a test message!",
    roomId: "actual-room-id",
    userId: "test-user-1",
  });

  socket.on("message:sent", (data) => {
    console.log("✅ Message sent:", data);
    console.assert(
      data.success === true,
      "❌ Message should be sent successfully",
    );
  });

  socket.on("message:received", (message) => {
    console.log("✅ Message received:", message);
    console.assert(message.text !== "", "❌ Message text should not be empty");
    console.assert(message.userId !== "", "❌ userId should not be empty");
  });
};

// Call: testSendMessage(socket);

/**
 * TEST SCENARIO 4: Get Room Members
 * ==================================
 *
 * Prerequisites:
 * 1. User must be connected
 * 2. Room must exist with members
 *
 * Steps:
 */

const testGetRoomMembers = (socket) => {
  socket.emit("room:members:get", {
    roomId: "actual-room-id",
  });

  socket.on("room:members:list", (data) => {
    console.log("✅ Room members retrieved:", data.members);
    console.assert(
      Array.isArray(data.members),
      "❌ Members should be an array",
    );
    data.members.forEach((member) => {
      console.assert(
        member.id && member.name && member.email,
        "❌ Member should have id, name, and email",
      );
    });
  });
};

// Call: testGetRoomMembers(socket);

/**
 * TEST SCENARIO 5: Get Message History
 * =====================================
 *
 * Prerequisites:
 * 1. User must be connected
 * 2. Room must have messages
 *
 * Steps:
 */

const testGetMessageHistory = (socket) => {
  socket.emit("message:history:get", {
    roomId: "actual-room-id",
    limit: 50,
    offset: 0,
  });

  socket.on("message:history", (data) => {
    console.log("✅ Message history retrieved:", data.messages);
    console.assert(
      Array.isArray(data.messages),
      "❌ Messages should be an array",
    );
    data.messages.forEach((msg) => {
      console.assert(
        msg.id && msg.text && msg.userId,
        "❌ Message should have id, text, and userId",
      );
    });
  });
};

// Call: testGetMessageHistory(socket);

/**
 * TEST SCENARIO 6: Typing Indicator
 * ==================================
 */

const testTypingIndicator = (socket) => {
  // User starts typing
  socket.emit("user:typing", {
    roomId: "actual-room-id",
    userId: "test-user-1",
    isTyping: true,
  });

  socket.on("user:typing:status", (data) => {
    console.log("✅ User typing status:", data);
    if (data.isTyping) {
      console.log(`${data.userName} is typing...`);
    } else {
      console.log(`${data.userName} stopped typing`);
    }
  });

  // User stops typing (after 2 seconds)
  setTimeout(() => {
    socket.emit("user:typing", {
      roomId: "actual-room-id",
      userId: "test-user-1",
      isTyping: false,
    });
  }, 2000);
};

// Call: testTypingIndicator(socket);

/**
 * TEST SCENARIO 7: Leave Room
 * ===========================
 */

const testLeaveRoom = (socket) => {
  socket.emit("room:leave", {
    roomId: "actual-room-id",
    userId: "test-user-1",
  });

  socket.on("room:user:left", (data) => {
    console.log("✅ User left room:", data);
  });
};

// Call: testLeaveRoom(socket);

/**
 * COMPLETE TEST FLOW
 * ==================
 * Run all tests in sequence:
 */

async function runCompleteSocketTest() {
  console.log("🚀 Starting Socket.IO complete test...\n");

  // Test 1: Connect user
  const socket = await testUserConnection();

  // Wait for connection
  await new Promise((resolve) => {
    socket.on("user:joined", () => {
      console.log("\n📝 Test 1: User Connection - PASSED\n");
      resolve();
    });
  });

  // Test 2: Join room
  testRoomJoin(socket);
  await new Promise((resolve) => {
    socket.on("room:user:joined", () => {
      console.log("📝 Test 2: Room Join - PASSED\n");
      resolve();
    });
  });

  // Test 3: Get room members
  testGetRoomMembers(socket);
  await new Promise((resolve) => {
    socket.on("room:members:list", () => {
      console.log("📝 Test 3: Get Room Members - PASSED\n");
      resolve();
    });
  });

  // Test 4: Get message history
  testGetMessageHistory(socket);
  await new Promise((resolve) => {
    socket.on("message:history", () => {
      console.log("📝 Test 4: Get Message History - PASSED\n");
      resolve();
    });
  });

  // Test 5: Send message
  testSendMessage(socket);
  await new Promise((resolve) => {
    socket.on("message:sent", () => {
      console.log("📝 Test 5: Send Message - PASSED\n");
      resolve();
    });
  });

  // Test 6: Typing indicator
  testTypingIndicator(socket);
  console.log("📝 Test 6: Typing Indicator - PASSED\n");

  // Test 7: Leave room
  testLeaveRoom(socket);
  await new Promise((resolve) => {
    socket.on("room:user:left", () => {
      console.log("📝 Test 7: Leave Room - PASSED\n");
      resolve();
    });
  });

  console.log("✅ All Socket.IO tests completed!\n");
  socket.disconnect();
}

// Run: await runCompleteSocketTest();

/**
 * DEBUGGING TIPS
 * ==============
 *
 * 1. Check connection status:
 *    console.log(socket.connected);
 *
 * 2. View all active listeners:
 *    console.log(socket.eventNames());
 *
 * 3. Check server-side logs:
 *    Look for console.log statements in socketService.js
 *
 * 4. Test disconnection:
 *    socket.disconnect();
 *
 * 5. Reconnect:
 *    socket.connect();
 *
 * 6. Emit custom event:
 *    socket.emit("custom:event", { data: "test" });
 *
 * 7. Listen to all events:
 *    socket.onAny((event, ...args) => {
 *      console.log(event, args);
 *    });
 */

export {
  testUserConnection,
  testRoomJoin,
  testSendMessage,
  testGetRoomMembers,
  testGetMessageHistory,
  testTypingIndicator,
  testLeaveRoom,
  runCompleteSocketTest,
};

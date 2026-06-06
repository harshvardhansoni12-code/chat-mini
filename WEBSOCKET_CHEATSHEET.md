# WebSocket Quick Reference Cheat Sheet

**Print this page or bookmark for quick lookup while implementing!**

---

## 📦 Installation

```bash
npm install socket.io socket.io-client
```

---

## 🚀 File Checklist

**CREATE** (New Files):

- [ ] `server.js` - Root level
- [ ] `src/lib/socket.js`
- [ ] `src/lib/socketContext.jsx`
- [ ] `src/components/chat/ChatRoom.jsx`
- [ ] `src/app/room/[id]/page.js`

**UPDATE** (Modify):

- [ ] `package.json` - Change dev script
- [ ] `src/app/provider.jsx` - Add SocketProvider

---

## 🔌 Client Events (Send from Client)

```javascript
// From component using useSocket()
const { socket, isConnected } = useSocket();

socket.emit("join-room", roomId);
socket.emit("send-message", { roomId, text });
socket.emit("update-message", { messageId, text, roomId });
socket.emit("delete-message", { messageId, roomId });
socket.emit("user-typing", { roomId });
socket.emit("user-stop-typing", { roomId });
socket.emit("leave-room", roomId);
```

---

## 📨 Server Events (Receive on Client)

```javascript
// Setup in useEffect()
socket.on("active-users", (users) => {});
socket.on("user-joined", (data) => {});
socket.on("user-left", (data) => {});
socket.on("new-message", (message) => {});
socket.on("message-updated", (data) => {});
socket.on("message-deleted", (data) => {});
socket.on("user-typing", (data) => {});
socket.on("user-stop-typing", (data) => {});
socket.on("error", (error) => {});
```

---

## 🏗️ Backend Event Handlers

```javascript
// In socket.js
socket.on("join-room", async (roomId) => {
  // Validate membership
  // Add to room
  // Broadcast 'user-joined'
});

socket.on("send-message", async (data) => {
  // Validate membership
  // Save to DB with Prisma
  // Broadcast 'new-message' to room
});

socket.on("disconnect", () => {
  // Remove from room tracking
  // Broadcast 'user-left'
});
```

---

## 🪝 React Hook Usage

```javascript
import { useSocket } from "@/lib/socketContext";
import { useSession } from "next-auth/react";

export function MyComponent({ roomId }) {
  const { socket, isConnected, error } = useSocket();
  const { data: session } = useSession();

  // Listen for events
  useEffect(() => {
    if (!socket) return;

    socket.on("new-message", (msg) => {
      // Handle message
    });

    return () => socket.off("new-message");
  }, [socket]);

  // Send events
  const sendMessage = (text) => {
    if (!socket?.connected) return;
    socket.emit("send-message", { roomId, text });
  };

  return (
    <div>
      Status: {isConnected ? "✅" : "❌"}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

---

## 📝 Common Data Structures

### Message Object

```javascript
{
  id: string,
  text: string,
  userId: string,
  userName: string,
  roomId: string,
  createdAt: Date
}
```

### User Object

```javascript
{
  socketId: string,
  userId: string,
  userName: string
}
```

### Error Object

```javascript
{
  message: string,
  code?: string
}
```

---

## ⚙️ Configuration

### Server Setup (server.js)

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    credentials: true,
  },
  transports: ["websocket", "polling"],
});
```

### Client Setup (socketContext.jsx)

```javascript
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
```

---

## 🧪 Testing Commands

```bash
# Start dev server
npm run dev

# Expected: "WebSocket Server Initialized"

# Open two browser tabs to same room
# Send message from tab 1
# Should appear instantly in tab 2 ✓

# Check browser console for errors
# Check network tab for WebSocket connection
# Check Terminal for server logs
```

---

## 🐛 Quick Troubleshooting

| Problem                | Solution                                         |
| ---------------------- | ------------------------------------------------ |
| Port 3000 in use       | `npx kill-port 3000` or use PORT=3001            |
| Module not found       | Run `npm install socket.io socket.io-client`     |
| No connection          | Check `NEXT_PUBLIC_APP_URL` environment variable |
| Messages not appearing | Check browser console + network tab              |
| Auth failed            | Verify session is active, user ID passed         |
| Memory leak            | Ensure socket.off() in cleanup function          |

---

## 🔐 Security Checklist

- [ ] Authentication middleware checks user exists
- [ ] Authorization checks user is room member
- [ ] Message validation before broadcast
- [ ] Ownership check for update/delete
- [ ] No console logging of sensitive data
- [ ] HTTPS/WSS in production
- [ ] Rate limiting considered
- [ ] Input sanitization done

---

## 📊 Monitoring Checklist

```javascript
// Add to socket.js for debugging
socket.onAny((event, ...args) => {
  console.log(`[Socket Event] ${event}`, args);
});

io.on("connection", (socket) => {
  console.log(`✅ User ${socket.userId} connected`);
});

socket.on("disconnect", () => {
  console.log(`❌ User disconnected`);
});
```

---

## 🚢 Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chat_mini

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Socket.IO
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📚 File Templates

### package.json Scripts

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

### Directory Structure Expected

```
chat-mini/
├── server.js                    ← NEW
├── package.json                 ← UPDATED
├── prisma/
│   └── schema.prisma
├── src/
│   ├── lib/
│   │   ├── socket.js            ← NEW
│   │   ├── socketContext.jsx    ← NEW
│   │   ├── prisma.js
│   │   └── utils.js
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatRoom.jsx     ← NEW
│   │   ├── auth/
│   │   └── ui/
│   └── app/
│       ├── provider.jsx          ← UPDATED
│       ├── room/
│       │   └── [id]/
│       │       └── page.js       ← NEW
│       └── api/
└── (other files)
```

---

## 💡 Pro Tips

1. **Test Locally First**: Use 2 browser tabs before mobile
2. **Check Session**: `console.log(useSession())` in component
3. **Enable Debug**: `DEBUG=socket.io* npm run dev`
4. **Monitor Connections**: Add logging in disconnect event
5. **Handle Errors**: Always add `socket.on('error', ...)` listener
6. **Clean Up**: Always remove listeners in useEffect return
7. **Validate on Server**: Never trust client-side validation only
8. **Persist Then Broadcast**: Save to DB before emitting to room

---

## 🆘 Emergency Debugging

```javascript
// In browser console
io = io.connect("http://localhost:3000", {
  auth: { userId: "test", token: "test" },
});

io.on("connect", () => console.log("✅ Connected"));
io.on("error", (err) => console.error("❌", err));
io.on("connect_error", (err) => console.error("Connection Error", err));

// Test emit
io.emit("join-room", "test-room-id");

// View all events
io.onAny((event, data) => console.log(event, data));
```

---

## 📞 Support Resources

| Resource       | URL                            |
| -------------- | ------------------------------ |
| Socket.IO Docs | https://socket.io/docs/        |
| Next.js Docs   | https://nextjs.org/docs        |
| Prisma Docs    | https://www.prisma.io/docs     |
| NextAuth.js    | https://next-auth.js.org       |
| Full Guide     | WEBSOCKET_INTEGRATION_GUIDE.md |
| Diagrams       | WEBSOCKET_ARCHITECTURE.md      |
| Checklist      | WEBSOCKET_ACTION_PLAN.md       |

---

## ⏱️ Timeline

| Phase     | Task               | Time       | Status |
| --------- | ------------------ | ---------- | ------ |
| 1         | Install & Setup    | 15 min     | ⭕     |
| 2         | Backend Config     | 15 min     | ⭕     |
| 3         | Frontend Build     | 20 min     | ⭕     |
| 4         | Testing            | 10 min     | ⭕     |
| **Total** | **Implementation** | **60 min** | ⭕     |

---

## ✅ Implementation Verification

After completing implementation, verify:

```javascript
// ✅ Can Connect
socket.connected === true

// ✅ Can Join Room
socket.rooms.has(roomId) === true

// ✅ Can Send Messages
socket.emit('send-message', { roomId, text })

// ✅ Can Receive Messages
socket.on('new-message', (msg) => console.log(msg))

// ✅ Handles Disconnection
socket.on('disconnect', () => console.log('Disconnected'))

// ✅ Auto-Reconnect Works
[network offline] → [wait] → [reconnects automatically]

// ✅ No Memory Leaks
DevTools → Memory → Check for growing heap
```

---

**Print or bookmark this page! Keep it handy while implementing.** 🚀

Last Updated: 2026-06-05

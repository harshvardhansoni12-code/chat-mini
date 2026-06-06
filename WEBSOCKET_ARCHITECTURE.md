# WebSocket Architecture & Flow Diagrams

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                       │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  React Component │  │  React Component │  │  React Component │  │
│  │   (ChatRoom)     │  │   (UserList)     │  │   (Typing Ind.)  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │             │
│           └─────────────────────┼─────────────────────┘             │
│                                 │                                   │
│                        ┌────────▼────────┐                          │
│                        │ useSocket Hook   │                          │
│                        │ (Consumer)       │                          │
│                        └────────┬────────┘                          │
│                                 │                                   │
│                        ┌────────▼────────┐                          │
│                        │  Socket.IO Client │                        │
│                        │  (socket.io-client)│                       │
│                        └────────┬────────┘                          │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │    WebSocket / HTTP Polling   │
                  │    (Auto Selection)           │
                  └───────────────┬───────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                                 │                                    │
│                         SERVER LAYER (Node.js)                       │
│                                 │                                    │
│                        ┌────────▼────────┐                          │
│                        │  Socket.IO Server │                        │
│                        │  (socket.io)     │                         │
│                        └────┬──────┬──────┘                         │
│                             │      │                               │
│          ┌──────────────────┘      └──────────────────┐            │
│          │                                           │             │
│    ┌─────▼─────┐                            ┌────────▼────┐       │
│    │ Room Mgmt │                            │ Auth/Events │       │
│    │ & Events  │                            │ Handlers    │       │
│    └─────┬─────┘                            └────────┬────┘       │
│          │                                          │              │
│          └──────────────────┬───────────────────────┘              │
│                             │                                      │
│                        ┌────▼─────┐                               │
│                        │ Prisma   │                               │
│                        │ Client   │                               │
│                        └────┬─────┘                               │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────────┐
│                             │                                      │
│                    DATA LAYER (PostgreSQL)                         │
│                             │                                      │
│                    ┌────────▼────────┐                            │
│                    │  Database       │                            │
│                    │  (PostgreSQL)   │                            │
│                    │                 │                            │
│                    │  - Users        │                            │
│                    │  - Rooms        │                            │
│                    │  - Messages     │                            │
│                    │  - Members      │                            │
│                    └─────────────────┘                            │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Message Flow Diagram

### Scenario: User A sends a message to Room

```
User A (Browser Tab 1)          Server                  Database            User B (Browser Tab 2)
       │                          │                         │                      │
       │  Socket connects         │                         │                      │
       ├─────────────────────────>│                         │                      │
       │                          │ Validate auth           │                      │
       │                          │ (Middleware)            │                      │
       │  Connection established  │                         │                      │
       │<─────────────────────────┤                         │                      │
       │                          │                         │                      │
       │  Joins Room              │                         │                      │
       ├─────────────────────────>│                         │                      │
       │                          │ Add to room             │                      │
       │                          │ Track connection        │                      │
       │  Join confirmed          │                         │                      │
       │<─────────────────────────┤                         │                      │
       │                          │                         │                      │
       │  Types "Hello"           │                         │                      │
       │  (Typing event)          │                         │                      │
       ├─────────────────────────>│                         │                      │
       │                          ├───────────── Broadcast ────────────────────────>│
       │                          │ "user-typing"          │                      │
       │                          │                        │              Display: "User A typing..."
       │                          │                        │                      │
       │  Sends Message           │                         │                      │
       ├─────────────────────────>│ send-message            │                      │
       │                          │                         │                      │
       │                          │ Validate membership     │                      │
       │                          │                         │                      │
       │                          ├──────────────────────────>│                    │
       │                          │ Save to DB              │                      │
       │                          │ INSERT INTO messages    │                      │
       │                          │<──────────────────────────│                    │
       │                          │ Message saved with ID   │                      │
       │                          │                         │                      │
       │  Message confirmed       │                         │                      │
       │<─────────────────────────┤                         │                      │
       │  (added to local state)  │                         │                      │
       │                          │                         │                      │
       │                          ├─────── Broadcast ───────────────────────────────>│
       │                          │ "new-message"           │ (to all in room)   │
       │                          │ {id, text, sender, ...} │                      │
       │                          │                         │              Receive & Display
       │                          │                         │                      │
       │                          ├──────────────── Stop Typing ───────────────────>│
       │                          │                         │                      │
       │                          │                         │                      │
```

---

## 3. Socket Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT EVENTS (Sent)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  join-room          → User joins a chat room                    │
│  send-message       → User sends a message                      │
│  update-message     → User edits a message                      │
│  delete-message     → User deletes a message                    │
│  user-typing        → User starts typing                        │
│  user-stop-typing   → User stops typing                         │
│  leave-room         → User leaves a room                        │
│                                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ (Socket.IO Server)
             │
┌────────────▼────────────────────────────────────────────────────┐
│                   SERVER PROCESSING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Validate user authentication                               │
│  2. Check authorization (member of room)                       │
│  3. Process event (DB operations if needed)                    │
│  4. Broadcast to room members                                  │
│  5. Handle errors gracefully                                   │
│                                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ (Broadcast Events)
             │
┌────────────▼────────────────────────────────────────────────────┐
│                   SERVER EVENTS (Received)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  active-users       → List of users currently in room          │
│  user-joined        → Notification of new user                 │
│  user-left          → Notification of user leaving             │
│  new-message        → New message received                      │
│  message-updated    → Message was edited                        │
│  message-deleted    → Message was deleted                       │
│  user-typing        → Another user is typing                    │
│  user-stop-typing   → User stopped typing                       │
│  error              → Error message from server                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Room Connection Management

```
Room: "room-123"

Active Connections:
┌──────────────────────────────────────────────────────────┐
│ Socket ID: xyz123                                        │
│ User ID: user-1                                          │
│ User Name: Alice                                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Socket ID: abc456                                        │
│ User ID: user-2                                          │
│ User Name: Bob                                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Socket ID: def789                                        │
│ User ID: user-3                                          │
│ User Name: Charlie                                       │
└──────────────────────────────────────────────────────────┘


Broadcast Example:
When Alice sends a message:
  ┌─────────────────────┐
  │  Alice (Sender)     │ ← Receives "message confirmed"
  └─────────────────────┘

  ┌─────────────────────┐
  │  Bob (Receiver)     │ ← Receives "new-message"
  └─────────────────────┘

  ┌─────────────────────┐
  │  Charlie (Receiver) │ ← Receives "new-message"
  └─────────────────────┘

  ┌─────────────────────┐
  │  Database           │ ← Persists message
  └─────────────────────┘
```

---

## 5. State Management Flow

```
CLIENT STATE
├── messages: Message[]              ← All messages in current room
├── inputValue: string               ← Current input text
├── activeUsers: User[]              ← Users in room
├── typingUsers: Set<userId>         ← Users currently typing
├── loading: boolean                 ← Loading state
└── socket: Socket                   ← Socket instance

SERVER STATE
├── io: Server                       ← Socket.IO server instance
├── roomConnections: Map             ← Track connections per room
│   └── roomId → [
│       { socketId, userId, userName },
│       { socketId, userId, userName },
│       ...
│     ]
└── Prisma Database                  ← Persistent storage
    ├── Users
    ├── Rooms
    ├── Messages
    └── Members
```

---

## 6. Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (React Component)                                   │
│                                                              │
│  1. User logs in via NextAuth                              │
│     useSession() → session = { user: { id, email, ... } }  │
│                                                              │
│  2. Socket connection established                           │
│     socket = io({                                           │
│       auth: {                                               │
│         userId: session.user.id,                            │
│         token: session.accessToken                          │
│       }                                                      │
│     })                                                       │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Socket auth data sent
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Socket.IO Middleware)                              │
│                                                              │
│  io.use(async (socket, next) => {                           │
│    const userId = socket.handshake.auth.userId             │
│    const user = await prisma.user.findUnique({             │
│      where: { id: userId }                                 │
│    })                                                       │
│                                                              │
│    if (!user) {                                             │
│      return next(new Error('User not found'))              │
│    }                                                        │
│                                                              │
│    socket.userId = userId                                  │
│    socket.userName = user.name                             │
│    next() // Allow connection                              │
│  })                                                         │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ✅ Connection allowed
                           │
```

---

## 7. Message Persistence Flow

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT: User sends message                                 │
│                                                              │
│  Message: { text: "Hello", roomId: "123" }                 │
│                                                              │
│  socket.emit('send-message', { roomId, text })             │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER: Process and Validate                               │
│                                                              │
│  1. Check user is authenticated                            │
│  2. Verify user is member of room                          │
│  3. Sanitize text input                                    │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Persist Message                                  │
│                                                              │
│  await prisma.message.create({                             │
│    data: {                                                  │
│      text: "Hello",                                        │
│      roomId: "123",                                        │
│      userId: "user-1",                                     │
│      memberId: "member-1",                                 │
│      createdAt: now()                                      │
│    }                                                        │
│  })                                                         │
│  → Returns { id: "msg-123", ...}                           │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER: Broadcast to Room                                  │
│                                                              │
│  io.to(roomId).emit('new-message', {                       │
│    id: 'msg-123',                                          │
│    text: 'Hello',                                          │
│    userId: 'user-1',                                       │
│    userName: 'Alice',                                      │
│    createdAt: timestamp,                                   │
│    roomId: '123'                                           │
│  })                                                         │
│                                                              │
│  → Sent to all users in room (except sender gets confirm)  │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CLIENT: Receive & Display                                  │
│                                                              │
│  socket.on('new-message', (message) => {                   │
│    setMessages(prev => [...prev, message])                 │
│  })                                                         │
│                                                              │
│  → Message appears in chat UI for all users                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Typing Indicator Flow

```
User A starts typing "Hello Bob..."

BEFORE MESSAGE SENT:
┌─────────────────────────────────────────────────────────────┐
│  Input: "H"                                                  │
│  onChange handler:                                           │
│  socket.emit('user-typing', { roomId: '123' })             │
└──────────────────┬───────────────────────────────────────────┘
                   │
        Broadcasts to room
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  All OTHER users see:                                        │
│  "Alice is typing..."                                       │
│                                                              │
│  [========== Chat UI ==========]                            │
│  Alice: Previous message                                    │
│                                                              │
│  Alice is typing... ✏️                                      │
│                                                              │
│  [Input box]                                                │
│  [Send button]                                              │
└─────────────────────────────────────────────────────────────┘

AFTER 3 SECONDS OF INACTIVITY:
┌─────────────────────────────────────────────────────────────┐
│  Timeout triggered:                                          │
│  socket.emit('user-stop-typing', { roomId: '123' })        │
└──────────────────┬───────────────────────────────────────────┘
                   │
        Broadcasts to room
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  All OTHER users see:                                        │
│  Typing indicator disappears                                │
│                                                              │
│  [========== Chat UI ==========]                            │
│  Alice: Previous message                                    │
│                                                              │
│  (Typing indicator gone)                                    │
│                                                              │
│  [Input box]                                                │
│  [Send button]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Disconnection & Reconnection

```
NORMAL DISCONNECT:
┌──────────────────────────────────────────────┐
│ User closes tab or navigates away            │
│                                              │
│ socket.on('disconnect', () => {              │
│   - Remove from room tracking               │
│   - Broadcast 'user-left' to room            │
│   - Clear memory                             │
│ })                                           │
│                                              │
│ All other users see:                         │
│ "Alice left the room"                        │
└──────────────────────────────────────────────┘

UNEXPECTED DISCONNECT + RECONNECTION:
┌──────────────────────────────────────────────┐
│ Network interruption                         │
│ (auto-handled by Socket.IO)                  │
│                                              │
│ Client attempts automatic reconnection:      │
│ Attempt 1: wait 1000ms                       │
│ Attempt 2: wait 2000ms                       │
│ Attempt 3: wait 3000ms                       │
│ Attempt 4: wait 4000ms                       │
│ Attempt 5: wait 5000ms                       │
│                                              │
│ If reconnection successful:                  │
│ - Re-authenticate                            │
│ - Re-join room                               │
│ - Sync any missed messages                   │
│ - Resume normal operation                    │
│                                              │
│ If reconnection fails after 5 attempts:      │
│ - Show "Connection Lost" UI                  │
│ - Offer manual retry                         │
└──────────────────────────────────────────────┘
```

---

## 10. Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│  ERROR SCENARIOS                                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Authentication Failed                                     │
│  ├─ User ID not provided                                  │
│  ├─ User not found in database                            │
│  └─ Token invalid                                         │
│     → Connection denied                                    │
│     → Show: "Authentication failed"                       │
│     → Action: Redirect to login                           │
│                                                             │
│  Authorization Failed                                      │
│  ├─ User not member of room                               │
│  ├─ Trying to delete other's message                      │
│  └─ Trying to edit other's message                        │
│     → Operation denied                                     │
│     → Show: "You don't have permission"                   │
│     → Action: Prevent UI action                           │
│                                                             │
│  Database Error                                            │
│  ├─ Connection timeout                                    │
│  ├─ Query failed                                          │
│  └─ Constraint violation                                  │
│     → Operation failed                                     │
│     → Show: "Failed to save message. Retry?"              │
│     → Action: Show retry button                           │
│                                                             │
│  Network Error                                             │
│  ├─ Connection lost                                       │
│  ├─ Timeout                                               │
│  └─ Browser offline                                       │
│     → Attempt auto-reconnect                              │
│     → Show: "Reconnecting..."                             │
│     → Action: Queue messages locally                      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Data Flow Summary

```
🔄 COMPLETE CYCLE:

User A (Browser)
       │
       ├─ Form Input ──────────────┐
       │                           │
       ├─ React State Update       │
       │                           │
       ├─ Socket.emit() ───────────┤
       │                           │
       │                   Server (Node.js)
       │                           │
       │         Authenticate ─────┤
       │                    │      │
       │         Validate ──┴──────┤
       │                           │
       │         Prisma.create()───┤
       │                 │         │
       │                 └─────────┤
       │                   Database│
       │                 (Save msg)│
       │                           │
       ├─ io.to(room).emit() ◄─────┤
       │    (Broadcast)            │
       │                           │
       ├─ socket.on() ◄────────────┤
       │                           │
       └─ Update state ◄───────────┤
         Re-render UI              Server
                                    │
                                    └─ Other Browsers
                                       │
                                       ├─ socket.on()
                                       │
                                       ├─ Update state
                                       │
                                       └─ Re-render UI
```

---

## Quick Reference: Files & Locations

```
File Structure:

ROOT
├── server.js                 ← HTTP Server with Socket.IO
└── src/
    ├── lib/
    │   ├── socket.js         ← Socket.IO Configuration
    │   ├── socketContext.jsx ← React Context Provider
    │   ├── prisma.js         ← Prisma Client (existing)
    │   └── utils.js          ← Utilities (existing)
    │
    ├── components/
    │   ├── chat/
    │   │   └── ChatRoom.jsx   ← Main Chat Component (NEW)
    │   ├── auth/
    │   │   └── UserAuth.jsx   ← Auth (existing)
    │   └── ui/                ← UI Components (existing)
    │
    ├── app/
    │   ├── provider.jsx       ← Providers (UPDATE)
    │   ├── layout.js          ← Layout (existing)
    │   ├── page.js            ← Home (existing)
    │   │
    │   ├── room/
    │   │   └── [id]/
    │   │       └── page.js    ← Room Page (NEW)
    │   │
    │   └── api/               ← REST Routes (existing)
    │       ├── message/
    │       ├── rooms/
    │       ├── user/
    │       └── auth/
    │
    └── generated/
        └── prisma/           ← Auto-generated (existing)

DATABASE SCHEMA (Prisma):
User
├── id
├── name
├── email
├── password
├── room[]  ← Authored rooms
├── member[]  ← Room memberships
└── message[]  ← Sent messages

Room
├── id
├── roomname
├── roomcode
├── author (User)
├── member[]
└── message[]

Member
├── id
├── user (User)
├── room (Room)
└── message[]

Message
├── id
├── text
├── createdAt
├── room (Room)
├── user (User)
└── member (Member)
```

---

This architecture provides:
✅ Real-time messaging  
✅ Scalability  
✅ Error handling  
✅ Security  
✅ Data persistence  
✅ Automatic reconnection  
✅ Typing indicators  
✅ Multi-user awareness

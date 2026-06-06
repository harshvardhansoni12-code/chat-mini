# WebSocket Implementation Action Plan

**Project**: Chat-Mini  
**Framework**: Next.js 16 + React 19 + Prisma  
**Date Created**: 2026-06-05

---

## Quick Start (30-60 minutes)

### ✅ Phase 1: Setup (15 min)

- [ ] Install dependencies: `npm install socket.io socket.io-client`
- [ ] Create `server.js` in project root
- [ ] Create `src/lib/socket.js` for Socket.IO initialization
- [ ] Update `package.json` scripts (change dev script)
- [ ] Test: `npm run dev` - should show "WebSocket Server Initialized"

### ✅ Phase 2: Backend (15 min)

- [ ] Create `src/lib/socketContext.jsx` for Socket.IO client
- [ ] Update `src/app/provider.jsx` to include `<SocketProvider>`
- [ ] Verify authentication middleware in socket.js works

### ✅ Phase 3: Frontend (20 min)

- [ ] Create `src/components/chat/ChatRoom.jsx` component
- [ ] Create `src/app/room/[id]/page.js` route
- [ ] Use `useSocket()` hook in ChatRoom component
- [ ] Implement message sending/receiving
- [ ] Test in browser with multiple tabs

### ✅ Phase 4: Testing (10 min)

- [ ] Open room in two browser tabs
- [ ] Send message from tab 1 → appears in tab 2 instantly
- [ ] Send message from tab 2 → appears in tab 1 instantly
- [ ] Verify typing indicator shows user names
- [ ] Test disconnection and reconnection

---

## File Creation Checklist

### New Files to Create

```
project-root/
├── server.js                          ← Custom HTTP server with Socket.IO
├── src/
│   ├── lib/
│   │   ├── socket.js                  ← Socket.IO server configuration
│   │   └── socketContext.jsx          ← React context for Socket.IO client
│   ├── components/
│   │   └── chat/
│   │       └── ChatRoom.jsx           ← Main chat component
│   └── app/
│       └── room/
│           └── [id]/
│               └── page.js            ← Room page route
```

### Modified Files

```
project-root/
├── package.json                       ← Update scripts
└── src/app/
    └── provider.jsx                   ← Add SocketProvider
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install socket.io socket.io-client
```

**Time**: 2 minutes  
**Verification**: Check `package.json` has both packages

---

### Step 2: Create Server File

**File**: `server.js` (in project root)

```javascript
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocket } from './src/lib/socket.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = initializeSocket(httpServer);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('> WebSocket Server Initialized');
    });
});
```

**Time**: 5 minutes

---

### Step 3: Create Socket Configuration

**File**: `src/lib/socket.js`

Copy from the comprehensive guide (Backend Implementation section)

**Key Events to Implement**:
- `join-room` - User joins a room
- `send-message` - Message creation
- `update-message` - Message edit
- `delete-message` - Message deletion
- `user-typing` - Typing indicator
- `user-stop-typing` - Stop typing
- `disconnect` - Clean cleanup

**Time**: 10 minutes

---

### Step 4: Update package.json

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

**Time**: 2 minutes

---

### Step 5: Create Socket Context

**File**: `src/lib/socketContext.jsx`

Copy from the comprehensive guide (Frontend Implementation - Step 1)

**Key Exports**:
- `SocketProvider` component
- `useSocket()` hook

**Time**: 5 minutes

---

### Step 6: Update App Provider

**File**: `src/app/provider.jsx`

```javascript
'use client';

import { SessionProvider } from 'next-auth/react';
import { SocketProvider } from '@/lib/socketContext';

export function Providers({ children }) {
  return (
    <SessionProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </SessionProvider>
  );
}
```

**Time**: 2 minutes

---

### Step 7: Create Chat Component

**File**: `src/components/chat/ChatRoom.jsx`

Copy from the comprehensive guide (Frontend Implementation - Step 3)

**Features**:
- Load message history on mount
- Join room on connection
- Send/receive messages in real-time
- Show typing indicators
- Delete/update messages
- Auto-scroll to latest message

**Time**: 15 minutes

---

### Step 8: Create Room Page

**File**: `src/app/room/[id]/page.js`

```javascript
'use client';

import { ChatRoom } from '@/components/chat/ChatRoom';
import { useParams } from 'next/navigation';

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

**Time**: 3 minutes

---

### Step 9: Test the Implementation

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Expected output**:
   ```
   > Ready on http://localhost:3000
   > WebSocket Server Initialized
   ```

3. **Test in browser**:
   - Navigate to `http://localhost:3000/room/[some-room-id]`
   - Open same URL in second tab
   - Send message from tab 1
   - Verify it appears in tab 2 instantly
   - Check console for no errors

**Time**: 10 minutes

---

## Troubleshooting

### Problem: "Cannot find module socket.io"

**Solution**: Run `npm install socket.io socket.io-client` again

---

### Problem: "Error: listen EADDRINUSE: address already in use :::3000"

**Solution**: 
```bash
# Kill process on port 3000
# Windows:
npx kill-port 3000

# Or change port:
PORT=3001 npm run dev
```

---

### Problem: Messages not appearing in real-time

**Check**:
1. Browser console for errors
2. Network tab → WebSocket connection
3. Terminal for server logs
4. Verify user is member of room in database

---

### Problem: "Authentication failed"

**Check**:
1. Session is active (`useSession()` returns data)
2. User ID is being passed in socket auth
3. NextAuth is properly configured

---

## Integration with Existing REST API

Your current REST API routes continue to work:
- `POST /api/message/send-message` - Still available
- `GET /api/message/get-message` - Still available
- `PUT /api/message/update-message` - Still available
- `DELETE /api/message/delete-message` - Still available

**Recommendation**: Use WebSocket for real-time chat, keep REST for bulk operations.

---

## Performance Optimization (Optional)

### Add Message Pagination

Modify `ChatRoom.jsx` to load more messages on scroll:

```javascript
const handleLoadMore = async () => {
  const response = await fetch(
    `/api/message/get-message?roomId=${roomId}&skip=${messages.length}&limit=20`
  );
  const data = await response.json();
  setMessages([...data.reverse(), ...messages]);
};
```

---

### Add Redis Adapter (for multiple server instances)

```bash
npm install @socket.io/redis-adapter redis
```

Then in `socket.js`:

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## Common Patterns

### Listen for All Socket Events

```javascript
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

---

### Emit Acknowledgment from Client

```javascript
socket.emit('send-message', data, (response) => {
  console.log('Server acknowledged:', response);
});
```

---

### Emit Acknowledgment from Server

```javascript
socket.on('send-message', (data, callback) => {
  // Process message
  callback({ success: true, messageId: 'xyz' });
});
```

---

## Security Checklist

- [x] Authentication middleware on socket connection
- [x] Verify user is member of room before operations
- [x] Sanitize message text input
- [x] Check ownership before update/delete
- [x] Rate limit messages per user
- [x] Use HTTPS/WSS in production

---

## Next: Add Features

After basic implementation works, consider:

1. **Typing Indicator** ← Already included
2. **User Status** (online/offline)
3. **Message Read Receipts**
4. **Direct Messages** (1-on-1 chat)
5. **File Sharing**
6. **Message Search**
7. **Notifications** (desktop, email)
8. **Message Reactions** (emoji)
9. **Video/Voice Calls**

---

## Support Links

- [Full Comprehensive Guide](./WEBSOCKET_INTEGRATION_GUIDE.md) - Refer for detailed explanations
- [Socket.IO Official Docs](https://socket.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma ORM Guide](https://www.prisma.io/docs/)

---

## Quick Reference: Key Commands

```bash
# Install dependencies
npm install socket.io socket.io-client

# Start dev server
npm run dev

# Build for production
npm build

# Start production server
npm start

# Debug with logs
DEBUG=socket.io* npm run dev

# Kill port 3000
npx kill-port 3000
```

---

**Estimated Total Time**: 1-2 hours  
**Difficulty Level**: Intermediate  
**Prerequisites**: Basic Node.js, React, Next.js knowledge

✅ **Ready to implement? Start with Step 1 above!**

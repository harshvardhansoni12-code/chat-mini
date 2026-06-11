// This file is for Socket.IO server setup with Next.js
// In Next.js 13+, Socket.IO is typically run alongside the Next server
// This can be initialized in a custom server or via middleware

import { createServer } from "http";
import next from "next";
import { initializeSocket } from "@/lib/socketService";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize Socket.IO
  initializeSocket(httpServer);

  const PORT = process.env.PORT || 3000;

  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server initialized`);
  });
});

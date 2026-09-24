# Socket.IO Deployment Architecture Report

## Summary

This project was updated to run the Next.js app and the Socket.IO server together as a single Node.js application behind one HTTP server. This keeps the existing Socket.IO event names and database logic intact while making the app deployable on Railway without a separate frontend/backend repo.

## Root issues found

1. The app was attempting to connect to Socket.IO at a hardcoded port, `http://localhost:3001`, instead of using the app’s current origin.
2. There was no single custom Node server initializing Socket.IO on the same HTTP server that serves Next.js.
3. CORS was configured against a Socket.IO URL rather than the actual frontend application origin.
4. Prisma was configured with a generator setup that was not compatible with the current runtime architecture.
5. The `/api/socket` route was being treated as the actual Socket.IO server instead of a health/status endpoint.

## What was changed

### 1) Custom server created

A root-level custom server was added at [server.js](server.js).

It now:

- creates a Node HTTP server
- initializes Next.js
- passes all requests to Next.js
- calls `initializeSocket(httpServer)`
- listens on `process.env.PORT || 3000`
- binds to `0.0.0.0`

### 2) Startup scripts fixed

The production app is started through the custom server instead of the default Next.js standalone server.

Updated scripts:

```json
"scripts": {
  "dev": "node server.js",
  "build": "next build",
  "start": "node server.js"
}
```

### 3) Client connection changed to same-origin defaults

The Socket.IO client was changed to avoid a hardcoded port and instead use the app origin by default.

Updated pattern:

```js
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
```

This allows the browser to connect to the current application origin automatically when no explicit override is needed.

### 4) CORS fixed

Socket.IO CORS was changed to allow the app origin rather than the Socket.IO URL itself.

The logic allows:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SOCKET_URL` if explicitly needed
- localhost development origins

This avoids the unsafe `origin: "*"` workaround while supporting local development and production.

### 5) Duplicate Socket.IO initialization prevented

The Socket.IO service was updated so `initializeSocket()` does not create multiple Socket.IO servers if the same server is initialized more than once.

### 6) Prisma compatibility fixed

The Prisma JS generator and runtime import pattern were corrected so the app can build and run in a single Node application without changing the existing database schema or Prisma service logic.

### 7) Route kept as status endpoint only

The existing `/api/socket` route was retained as a health/status endpoint, but it is no longer treated as the real Socket.IO server. The actual Socket.IO server is only created in the custom server.

## Architecture now

```text
Browser
  ↓
Node HTTP server
  ├── Next.js app
  └── Socket.IO
        ↓
      Prisma
        ↓
     PostgreSQL
```

## Required environment variables

### Local development

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Railway)

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

`NEXT_PUBLIC_SOCKET_URL` is not required for the same-origin deployment model.

## Verified commands

The following were run successfully:

```bash
npm install
npx prisma generate
npm run build
```

A live Socket.IO connection was also verified against the running app:

```text
Socket connected: CCJxpCTqlK9R2cHCAAAB
```

## Manual browser testing checklist

Open two browser windows to http://localhost:3000 and verify:

- both users connect to Socket.IO
- user join works
- room join works
- messages are delivered in real time
- messages save to PostgreSQL
- message history works
- room members work
- typing indicator works
- leaving room works
- disconnect handling works

## Railway deployment notes

1. Push the repo to GitHub.
2. Create a new Railway project from that repo.
3. Use the start command:
   ```bash
   npm run start
   ```
4. Set environment variables in Railway.
5. Attach a PostgreSQL service.
6. Set `DATABASE_URL` to the Railway PostgreSQL connection string.
7. Deploy.

## Final result

The app is now structured so that Next.js, Socket.IO, Prisma, and PostgreSQL can run together as one deployable Node.js application on Railway without splitting the project into separate repositories or service boundaries.

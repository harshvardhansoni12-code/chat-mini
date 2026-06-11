import { initializeSocket, getIO } from "@/lib/socketService";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function GET(req) {
  try {
    const io = getIO();

    return new Response(
      JSON.stringify({
        status: "Socket.IO server is running",
        connectedClients: io.engine.clientsCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "Socket.IO server not initialized",
        error: error.message,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

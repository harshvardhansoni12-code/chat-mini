"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinRoomForm({ onRoomJoined }) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!roomCode.trim()) {
      setError("Room code is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/rooms/join-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomcode: roomCode.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to join room");
        setLoading(false);
        return;
      }

      // Room joined successfully (or already a member)
      if (onRoomJoined) {
        onRoomJoined(data.room);
      }

      setRoomCode("");

      // Navigate to the chat room
      if (data.room?.id) {
        router.push(`/chat/${data.room.id}`);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while joining the room");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Join Room</h2>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 uppercase"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ask the room creator for the code
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
      </form>
    </div>
  );
}

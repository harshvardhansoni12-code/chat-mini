"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateRoomForm({ onRoomCreated }) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const generateRandomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!roomName.trim() || !roomCode.trim()) {
      setError("Room name and code are required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/rooms/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomname: roomName,
          roomcode: roomCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to create room");
        setLoading(false);
        return;
      }

      // Room created successfully
      if (onRoomCreated) {
        onRoomCreated(data.room);
      }

      setRoomName("");
      setRoomCode("");

      // Redirect to the new room
      router.push(`/chat/${data.room.id}`);
    } catch (err) {
      console.error(err);
      setError("An error occurred while creating the room");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Create New Room</h2>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g., Project Team"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="e.g., ABC123"
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 uppercase"
            />
            <button
              type="button"
              onClick={generateRandomCode}
              disabled={loading}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium text-sm"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Share this code with others to let them join
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}

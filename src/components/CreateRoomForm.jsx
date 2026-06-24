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

      if (onRoomCreated) {
        onRoomCreated(data.room);
      }

      setRoomName("");
      setRoomCode("");

      router.push(`/chat/${data.room.id}`);
    } catch (err) {
      console.error(err);
      setError("An error occurred while creating the room");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create New Room</h2>
          <p className="text-xs text-gray-500">Start a new conversation</p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g., Project Team"
            disabled={loading}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none input-modern disabled:bg-gray-50 disabled:text-gray-400 text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Room Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="e.g., ABC123"
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none input-modern disabled:bg-gray-50 uppercase text-sm text-gray-900 placeholder-gray-400 font-mono"
            />
            <button
              type="button"
              onClick={generateRandomCode}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 font-medium text-sm transition-all"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Share this code with others to let them join
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl btn-primary font-medium text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : "Create Room"}
        </button>
      </form>
    </div>
  );
}

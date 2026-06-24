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

      if (onRoomJoined) {
        onRoomJoined(data.room);
      }

      setRoomCode("");

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Join Room</h2>
          <p className="text-xs text-gray-500">Enter a room code to join a conversation</p>
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
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            disabled={loading}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none input-modern disabled:bg-gray-50 uppercase text-sm text-gray-900 placeholder-gray-400 font-mono tracking-wider text-center text-lg"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Ask the room creator for the code
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-medium text-sm transition-all text-white"
          style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
          onMouseEnter={(e) => {
            e.target.style.background = "linear-gradient(135deg, #059669, #047857)";
            e.target.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "linear-gradient(135deg, #10B981, #059669)";
            e.target.style.boxShadow = "none";
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Joining...
            </span>
          ) : "Join Room"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";

export function MessageInput({ onSendMessage, onTyping, isConnected }) {
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleChange = (e) => {
    setMessageText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear typing indicator after user stops typing
    clearTimeout(handleChange.timeout);
    handleChange.timeout = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!messageText.trim() || !isConnected) return;

    onSendMessage(messageText);
    setMessageText("");
    setIsTyping(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-white border-t">
      <input
        type="text"
        value={messageText}
        onChange={handleChange}
        placeholder="Type a message..."
        disabled={!isConnected}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!isConnected || !messageText.trim()}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        Send
      </button>
    </form>
  );
}

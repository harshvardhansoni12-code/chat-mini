"use client";

import { useEffect, useRef } from "react";

export function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-96 overflow-y-auto bg-gray-50">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.userId === currentUserId ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs px-4 py-2 rounded-lg ${
              message.userId === currentUserId
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
            }`}
          >
            {message.userId !== currentUserId && (
              <p className="text-xs font-semibold mb-1">
                {message.userName || "Anonymous"}
              </p>
            )}
            <p className="break-words">{message.text}</p>
            <p
              className={`text-xs mt-1 ${
                message.userId === currentUserId
                  ? "text-blue-100"
                  : "text-gray-500"
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

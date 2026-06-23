"use client";

export function TypingIndicator({ typingUsers, currentUserId }) {
  const otherUsersTyping = typingUsers.filter(
    (user) => user.userId !== currentUserId,
  );

  if (otherUsersTyping.length === 0) return null;

  const names = otherUsersTyping.map((u) => u.userName || "Someone").join(", ");
  const isMultiple = otherUsersTyping.length > 1;

  return (
    <div className="px-4 py-2 text-sm text-gray-500 italic flex items-center gap-2">
      <span>
        {names} {isMultiple ? "are" : "is"} typing
      </span>
      <div className="flex gap-1">
        <span className="animate-bounce">.</span>
        <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
          .
        </span>
      </div>
    </div>
  );
}

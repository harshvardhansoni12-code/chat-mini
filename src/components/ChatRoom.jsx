"use client";

import { ChatContainer } from "./ChatContainer";

export function ChatRoom({ roomId, userId, userName }) {
  return <ChatContainer roomId={roomId} userId={userId} userName={userName} />;
}

export default ChatRoom;

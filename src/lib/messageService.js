import prisma from "@/lib/prisma";

export async function createMessage({ text, roomId, senderId }) {
  return prisma.message.create({
    data: {
      text,
      roomId,
      senderId,
    },
  });
}

export async function getMessagesByRoom(roomId) {
  return prisma.message.findMany({
    where: {
      roomId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

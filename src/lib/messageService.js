import prisma from "@/lib/prisma";

export async function createMessage({ text, roomId, senderId, memberId }) {
  return prisma.message.create({
    data: {
      text,
      roomId,
      userId: senderId,
      memberId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getMessagesByRoom(
  roomId,
  { limit = 50, offset = 0 } = {},
) {
  return prisma.message.findMany({
    where: {
      roomId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

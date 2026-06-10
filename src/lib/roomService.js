import prisma from "@/lib/prisma";

export async function createRoom({ roomname, roomcode, authorId }) {
  return prisma.room.create({
    data: {
      roomname,
      roomcode,
      authorId,
    },
  });
}

export async function findRoomByCode(roomcode) {
  return prisma.room.findUnique({
    where: {
      roomcode,
    },
  });
}

export async function findRoomById(id) {
  return prisma.room.findUnique({
    where: {
      id,
    },
    include: {
      author: true,
      member: {
        include: {
          user: true,
        },
      },
      message: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function listRoomsForUser(userId) {
  return prisma.room.findMany({
    where: {
      member: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      CreatedAt: "desc",
    },
  });
}

export async function addMemberToRoom({ roomId, userId }) {
  return prisma.member.create({
    data: {
      roomId,
      userId,
    },
  });
}

export async function findRoomMember({ roomId, userId }) {
  return prisma.member.findFirst({
    where: {
      roomId,
      userId,
    },
  });
}

export async function getRoomMemberById(memberId) {
  return prisma.member.findUnique({
    where: {
      id: memberId,
    },
    include: {
      user: true,
      room: true,
    },
  });
}

export async function listRoomMembers(roomId) {
  return prisma.member.findMany({
    where: {
      roomId,
    },
    include: {
      user: true,
    },
  });
}

export async function deleteRoom(roomId) {
  return prisma.room.update({
    where: {
      id: roomId,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return Response.json({ message: "user not logged in" }, { status: 401 });
  }

  const { roomcode } = await request.json();
  if (!roomcode) {
    return Response.json({ message: "roomcode is required" }, { status: 400 });
  }

  const roomFound = await prisma.room.findUnique({
    where: {
      roomcode,
    },
  });
  if (!roomFound) {
    return Response.json({ message: "this room does not exist" }, { status: 404 });
  }

  const existingMember = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      roomId: roomFound.id,
    },
  });
  if (existingMember) {
    return Response.json({ message: "already joined" }, { status: 409 });
  }

  const memberJoined = await prisma.member.create({
    data: {
      userId: session.user.id,
      roomId: roomFound.id,
    },
  });

  return Response.json({ memberJoined }, { status: 201 });
}

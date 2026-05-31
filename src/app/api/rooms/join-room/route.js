import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const { roomcode } = await request.json();
  if (!session || !session.user || !session.user.id) {
    return Response.json({ message: "user not logged in" }, { status: 401 });
  }
  const roomFound = await prisma.room.findUnique({
    where: {
      roomcode: roomcode,
    },
  });
  if (!roomFound) {
    return Response.json({ message: "this room not exist" }, { status: 400 });
  }
  const memberJoined = await prisma.member.create({
    data: {
      userId: session.user.id,
      roomId: roomFound.id,
    },
  });
  if (!memberJoined) {
    return Response.json({ message: "member not joined" }, { status: 301 });
  }
  return Response.json({ memberJoined }, { status: 201 });
}

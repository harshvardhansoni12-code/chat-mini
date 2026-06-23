import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return Response.json({ message: "roomId is required" }, { status: 400 });
    }

    // Verify user is a member
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id, roomId },
    });
    if (!member) {
      return Response.json({ message: "Not a member of this room" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return Response.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

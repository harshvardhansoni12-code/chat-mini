import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { roomId, text } = await request.json();

    if (!roomId || !text?.trim()) {
      return Response.json({ message: "roomId and text are required" }, { status: 400 });
    }

    // Verify user is a member and get memberId
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id, roomId },
    });
    if (!member) {
      return Response.json({ message: "Not a member of this room" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        roomId,
        userId: session.user.id,
        memberId: member.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json(
        { message: "Unauthorized. User not logged in." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return Response.json(
        { message: "roomId is required" },
        { status: 400 },
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        member: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { member: true, message: true },
        },
      },
    });

    if (!room) {
      return Response.json(
        { message: "Room not found" },
        { status: 404 },
      );
    }

    // Check if the user is a member of this room
    const isMember = room.member.some(
      (m) => m.userId === session.user.id,
    );

    if (!isMember) {
      return Response.json(
        { message: "You are not a member of this room" },
        { status: 403 },
      );
    }

    return Response.json({ room }, { status: 200 });
  } catch (error) {
    console.error("Error fetching room:", error);
    return Response.json(
      { message: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

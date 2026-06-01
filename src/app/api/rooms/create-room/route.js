import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json(
        { message: "Unauthorized. User not logged in." },
        { status: 401 },
      );
    }
    const { roomname, roomcode } = await request.json();

    if (!roomname || !roomcode) {
      return Response.json(
        { message: "roomname and roomcode are required" },
        { status: 400 },
      );
    }

    // Check if a room with this code already exists
    const existingRoom = await prisma.room.findUnique({
      where: { roomcode },
    });

    if (existingRoom) {
      return Response.json(
        { message: "Room code already exists" },
        { status: 400 },
      );
    }

    // Create the room and set the session user as the author
    const roomCreated = await prisma.room.create({
      data: {
        roomname,
        roomcode,
        authorId: session.user.id,
      },
    });

    const memberJoined = await prisma.member.create({
      data: {
        userId: session.user.id,
        roomId: roomCreated.id,
      },
    });

    if (!memberJoined) {
      return Response.json({ message: "room not joined" }, { status: 402 });
    }
    //  "csrfToken":"81656cfaaa1896f91383e0acac959d85b06732b2cb287a8b9c2417abb65e026c"
    return Response.json(
      { message: "Room created successfully", room: roomCreated },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return Response.json(
      { message: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

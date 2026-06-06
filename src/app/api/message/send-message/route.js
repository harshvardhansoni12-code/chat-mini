import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
export async function POST(request) {
  try {
    const session = await getServerSession();
    const { text } = await request.json();
    if (!session || !session.user.id) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
        },
      );
    }
    const messageCreated = await prisma.message.create({
      text: text,
      userId: session.user.id,
    });

    if (!messageCreated) {
      return Response.json(
        { error: "Failed to create message" },
        {
          status: 500,
        },
      );
    }
    console.log("Received message:", messageCreated);
    return Response.json(
      { message: "Message received", message: messageCreated },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { error: "Internal Server Error" },
      {
        status: 500,
      },
    );
  }
}

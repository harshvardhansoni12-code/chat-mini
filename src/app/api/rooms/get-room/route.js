import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return Response.json(
      { message: "Unauthorized. User not logged in." },
      { status: 401 },
    );
  }

  const roomExist = await prisma.room.findMany({
    where: {
      authorId: session.user.id,
    },
  });
  if (!roomExist) {
    return Response.json(
      { message: "users not joined any room" },
      { status: 301 },
    );
  }

  //
  return Response.json({ roomExist }, { status: 301 });
}

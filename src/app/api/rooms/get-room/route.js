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

  const rooms = await prisma.room.findMany({
    where: {
      member: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  return Response.json({ rooms }, { status: 200 });
}

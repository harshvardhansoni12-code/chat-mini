import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
export async function GET() {
  const session = await getServerSession();
  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = await prisma.message.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return Response.json({ messages }, { status: 200 });
}

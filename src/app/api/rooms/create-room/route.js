import { getServerSession } from "next-auth";

export async function POST(request) {
  const session = getServerSession();
  if (!session) {
    return Response.json({ message: "user not logged in" }, { status: 301 });
  }
}

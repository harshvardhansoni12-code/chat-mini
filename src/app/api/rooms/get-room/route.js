export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return Response.json(
      { message: "Unauthorized. User not logged in." },
      { status: 401 },
    );
  }

  const roomExist = await prisma.room.FindMany({
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

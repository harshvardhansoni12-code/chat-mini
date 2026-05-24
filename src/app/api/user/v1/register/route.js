export async function POST(request) {
  const { body } = await request.json();

  const userFound = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });
  if (userFound) {
    return Response.json({ message: "user already exists" }, { status: 401 });
  }

  const userCreated = await prisma.user.create({
    name: body.fullname,
    email: body.email,
    password: body.password,
  });
  if (!userCreated) {
    return Response.json({ message: "user not created" }, { status: 401 });
  }
  return Response.json(
    { message: "user created", userCreated },
    { status: 201 },
  );
}

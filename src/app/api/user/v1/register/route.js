import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
export async function POST(request) {
  try {
    const body = await request.json();
    const { fullname, email, password } = body || {};
    console.log(body);
    console.log("checking if user exists");
    const userFound = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (userFound) {
      return Response.json({ message: "user already exists" }, { status: 401 });
    }
    console.log("user does not exist, creating new user");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("password hashed, creating user");
    const userCreated = await prisma.user.create({
      data: {
        name: fullname,
        email,
        password: hashedPassword,
      },
    });
    console.log("user created", userCreated);
    if (!userCreated) {
      return Response.json({ message: "user not created" }, { status: 401 });
    }
    return Response.json(
      { message: "user created", userCreated },
      { status: 201 },
    );
  } catch (error) {
    console.log(error);
    return Response.json({ message: "internal server error" }, { status: 500 });
  }
}

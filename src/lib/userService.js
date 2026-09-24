import prisma from "./prisma.js";

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

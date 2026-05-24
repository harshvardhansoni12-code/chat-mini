import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcrypt";
import GitHubProvider from "next-auth/providers/github";
export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log(credentials);
        console.log("before user found");
        const userFound = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });
        if (!userFound) {
          return null;
        }
        console.log("after user found");
        console.log(userFound);
        console.log("before password compare");
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          userFound.password,
        );
        if (!isPasswordValid) {
          return null;
        }
        console.log("after password compare");
        return {
          id: userFound.id,
          email: userFound.email,
          name: userFound.fullname,
        };
      },
    }),
  ],
  //
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "github") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              fullname: user.name,
              password: "", // GitHub users don't need password
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
      };
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

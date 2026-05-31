import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },

  providers: [
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("=== AUTHORIZE CALLED ===");
        console.log("Credentials received:", JSON.stringify(credentials));

        if (!credentials?.email || !credentials?.password) {
          console.log("FAIL: Missing email or password");
          return null;
        }

        try {
          const userFound = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          console.log("User found:", userFound ? "YES" : "NO");

          if (!userFound) {
            console.log("FAIL: User not found in database");
            return null;
          }

          console.log("User password exists:", !!userFound.password);
          console.log("User password length:", userFound.password?.length);

          // Prevent GitHub users from logging in with credentials
          if (!userFound.password) {
            console.log("FAIL: User has no password (OAuth account)");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            userFound.password,
          );

          console.log("Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("FAIL: Invalid password");
            return null;
          }

          const result = {
            id: userFound.id,
            email: userFound.email,
            name: userFound.name,
          };
          console.log("SUCCESS: Returning user:", JSON.stringify(result));
          return result;
        } catch (error) {
          console.error("ERROR in authorize:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        const existingUser = await prisma.user.findUnique({
          where: {
            email: user.email,
          },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "",
              password: "",
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

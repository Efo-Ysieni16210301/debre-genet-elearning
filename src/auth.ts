import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials.email as string | undefined)
          ?.trim()
          .toLowerCase();
        const password = credentials.password as string | undefined;

        if (!email || !password || email.length > 254) {
          return null;
        }

        const windowStart = new Date(Date.now() - LOCK_WINDOW_MS);

        const recentFailures = await prisma.loginAttempt.count({
          where: { email, createdAt: { gte: windowStart } },
        });

        if (recentFailures >= MAX_FAILED_ATTEMPTS) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        const passwordsMatch = user
          ? await bcrypt.compare(password, user.password)
          : false;

        if (!user || !passwordsMatch) {
          await prisma.loginAttempt.create({ data: { email } });
          await prisma.loginAttempt.deleteMany({
            where: { createdAt: { lt: windowStart } },
          });
          return null;
        }

        await prisma.loginAttempt.deleteMany({ where: { email } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "STUDENT" | "TEACHER" | "ADMIN";
      }
      return session;
    },
  },
});

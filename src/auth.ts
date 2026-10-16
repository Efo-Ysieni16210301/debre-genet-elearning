import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { LOCK_WINDOW_MS, MAX_FAILED_ATTEMPTS } from "@/lib/login-limits";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (trigger === "update" && typeof session?.user?.name === "string") {
        token.name = session.user.name;
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

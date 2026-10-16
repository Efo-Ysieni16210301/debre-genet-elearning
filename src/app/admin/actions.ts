"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { ResetResult } from "@/lib/form-result";

const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
type RoleValue = (typeof ROLES)[number];

const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function temporaryPassword() {
  let result = "";

  for (let i = 0; i < 12; i++) {
    result += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }

  return result;
}

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Not authorized.");
  }

  if (session.user.id === userId) {
    throw new Error("You cannot change your own role.");
  }

  const newRole = formData.get("role") as string;

  if (!ROLES.includes(newRole as RoleValue)) {
    throw new Error("Invalid role.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as RoleValue },
  });

  revalidatePath("/admin");
}

export async function resetUserPassword(userId: string): Promise<ResetResult> {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Not authorized.");
  }

  if (session.user.id === userId) {
    return {
      ok: false,
      message: "Use your Account page to change your own password.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return { ok: false, message: "That user no longer exists." };
  }

  const password = temporaryPassword();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    }),
    prisma.loginAttempt.deleteMany({ where: { email: user.email } }),
  ]);

  console.info("ADMIN PASSWORD RESET", {
    by: session.user.id,
    target: userId,
  });

  return { ok: true, password };
}

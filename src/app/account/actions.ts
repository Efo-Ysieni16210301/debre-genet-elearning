"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth, unstable_update } from "@/auth";
import { LOCK_WINDOW_MS, MAX_FAILED_ATTEMPTS } from "@/lib/login-limits";
import type { FormResult } from "@/lib/form-result";

export async function updateProfile(formData: FormData): Promise<FormResult> {
  const session = await auth();

  if (!session) {
    return { ok: false, message: "You must be logged in." };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { ok: false, message: "Please enter your name." };
  }

  if (name.length > 100) {
    return {
      ok: false,
      message: "That name is too long (100 characters at most).",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  await unstable_update({ user: { name } });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<FormResult> {
  const session = await auth();

  if (!session) {
    return { ok: false, message: "You must be logged in." };
  }

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !next || !confirm) {
    return { ok: false, message: "Fill in all three password fields." };
  }

  if (next.length < 8) {
    return {
      ok: false,
      message: "The new password must be at least 8 characters.",
    };
  }

  if (next.length > 72) {
    return {
      ok: false,
      message: "The new password must be 72 characters or fewer.",
    };
  }

  if (next !== confirm) {
    return {
      ok: false,
      message: "The new password and the confirmation do not match.",
    };
  }

  if (next === current) {
    return {
      ok: false,
      message: "Choose a password that is different from your current one.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, password: true },
  });

  if (!user) {
    return { ok: false, message: "Your account could not be found." };
  }

  const windowStart = new Date(Date.now() - LOCK_WINDOW_MS);

  const recentFailures = await prisma.loginAttempt.count({
    where: { email: user.email, createdAt: { gte: windowStart } },
  });

  if (recentFailures >= MAX_FAILED_ATTEMPTS) {
    return {
      ok: false,
      message:
        "Too many incorrect attempts. Please wait 15 minutes and try again.",
    };
  }

  const matches = await bcrypt.compare(current, user.password);

  if (!matches) {
    await prisma.loginAttempt.create({ data: { email: user.email } });
    return { ok: false, message: "Your current password is not correct." };
  }

  const hashed = await bcrypt.hash(next, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  await prisma.loginAttempt.deleteMany({ where: { email: user.email } });

  return { ok: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
type RoleValue = (typeof ROLES)[number];

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

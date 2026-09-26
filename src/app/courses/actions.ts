"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function createCourse(formData: FormData) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    throw new Error("Not authorized to create courses.");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      teacherId: session.user.id,
    },
  });

  redirect(`/courses/${course.id}/edit`);
}

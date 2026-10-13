"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

export async function addLesson(courseId: string, formData: FormData) {
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error("Course not found.");
  }

  const isOwner = session?.user.id === course.teacherId;
  const isAdmin = session?.user.role === "ADMIN";

  if (!session || (!isOwner && !isAdmin)) {
    throw new Error("Not authorized to edit this course.");
  }

  const title = formData.get("title") as string;
  const textContent = formData.get("textContent") as string;
  const videoUrl = formData.get("videoUrl") as string;

  if (!title) {
    throw new Error("Lesson title is required.");
  }

  const lessonCount = await prisma.lesson.count({
    where: { courseId },
  });

  await prisma.lesson.create({
    data: {
      title,
      textContent: textContent || null,
      videoUrl: videoUrl || null,
      order: lessonCount + 1,
      courseId,
    },
  });

  revalidatePath(`/courses/${courseId}/edit`);
}

export async function publishCourse(courseId: string) {
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error("Course not found.");
  }

  const isOwner = session?.user.id === course.teacherId;
  const isAdmin = session?.user.role === "ADMIN";

  if (!session || (!isOwner && !isAdmin)) {
    throw new Error("Not authorized to publish this course.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { published: true },
  });

  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath("/courses");
}

export async function enrollInCourse(courseId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in to enroll.");
  }

  if (session.user.role !== "STUDENT") {
    throw new Error("Only students can enroll in courses.");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course || !course.published) {
    throw new Error("This course is not available.");
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  if (existingEnrollment) {
    throw new Error("Already enrolled in this course.");
  }

  await prisma.enrollment.create({
    data: {
      studentId: session.user.id,
      courseId,
    },
  });

  revalidatePath(`/courses/${courseId}`);
}

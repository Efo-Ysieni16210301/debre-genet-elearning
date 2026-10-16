"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormResult } from "@/lib/form-result";

async function requireCourseEditor(courseId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in.");
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) {
    throw new Error("Course not found.");
  }

  const isOwner = session.user.id === course.teacherId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized to edit this course.");
  }

  return course;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refreshCourse(courseId: string) {
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

type LessonFields = {
  title: string;
  textContent: string | null;
  videoUrl: string | null;
};

function readLesson(
  formData: FormData,
): { ok: true; value: LessonFields } | { ok: false; message: string } {
  const title = field(formData, "title");
  const textContent = field(formData, "textContent");
  const videoUrl = field(formData, "videoUrl");

  if (!title) {
    return { ok: false, message: "Give the lesson a title." };
  }

  if (title.length > 150) {
    return {
      ok: false,
      message: "The title is too long (150 characters at most).",
    };
  }

  if (textContent.length > 20000) {
    return { ok: false, message: "The lesson text is too long." };
  }

  if (videoUrl) {
    if (videoUrl.length > 500) {
      return { ok: false, message: "The video link is too long." };
    }

    let parsed: URL;

    try {
      parsed = new URL(videoUrl);
    } catch {
      return {
        ok: false,
        message: "The video link is not a valid web address.",
      };
    }

    if (parsed.protocol !== "https:") {
      return { ok: false, message: "The video link must start with https://" };
    }
  }

  return {
    ok: true,
    value: {
      title,
      textContent: textContent || null,
      videoUrl: videoUrl || null,
    },
  };
}

async function renumberLessons(courseId: string, ordered?: { id: string }[]) {
  const lessons =
    ordered ??
    (await prisma.lesson.findMany({
      where: { courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }));

  await prisma.$transaction(
    lessons.map((lesson, index) =>
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

export async function createLesson(
  courseId: string,
  formData: FormData,
): Promise<FormResult> {
  await requireCourseEditor(courseId);

  const parsed = readLesson(formData);

  if (!parsed.ok) {
    return parsed;
  }

  const last = await prisma.lesson.aggregate({
    where: { courseId },
    _max: { order: true },
  });

  await prisma.lesson.create({
    data: {
      ...parsed.value,
      order: (last._max.order ?? 0) + 1,
      courseId,
    },
  });

  refreshCourse(courseId);
  return { ok: true };
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  formData: FormData,
): Promise<FormResult> {
  await requireCourseEditor(courseId);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

  if (!lesson || lesson.courseId !== courseId) {
    throw new Error("Lesson not found in this course.");
  }

  const parsed = readLesson(formData);

  if (!parsed.ok) {
    return parsed;
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: parsed.value,
  });

  if (parsed.value.videoUrl !== lesson.videoUrl) {
    await prisma.videoWatch.deleteMany({ where: { lessonId } });
  }

  refreshCourse(courseId);
  return { ok: true };
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireCourseEditor(courseId);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

  if (!lesson || lesson.courseId !== courseId) {
    throw new Error("Lesson not found in this course.");
  }

  await prisma.lesson.delete({ where: { id: lessonId } });
  await renumberLessons(courseId);
  refreshCourse(courseId);
}

export async function moveLesson(
  courseId: string,
  lessonId: string,
  direction: "up" | "down",
) {
  await requireCourseEditor(courseId);

  if (direction !== "up" && direction !== "down") {
    throw new Error("Invalid direction.");
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const from = lessons.findIndex((lesson) => lesson.id === lessonId);
  const to = direction === "up" ? from - 1 : from + 1;

  if (from === -1 || to < 0 || to >= lessons.length) {
    return;
  }

  [lessons[from], lessons[to]] = [lessons[to], lessons[from]];

  await renumberLessons(courseId, lessons);
  refreshCourse(courseId);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireCourseEditor(courseId);

  const title = field(formData, "title");
  const description = field(formData, "description");

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  if (title.length > 120 || description.length > 2000) {
    throw new Error("The title or description is too long.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { title, description },
  });

  refreshCourse(courseId);
}

export async function unpublishCourse(courseId: string) {
  await requireCourseEditor(courseId);

  await prisma.course.update({
    where: { id: courseId },
    data: { published: false },
  });

  refreshCourse(courseId);
}

export async function deleteCourse(courseId: string) {
  await requireCourseEditor(courseId);

  const enrolled = await prisma.enrollment.count({ where: { courseId } });

  if (enrolled > 0) {
    throw new Error(
      "A course with enrolled students cannot be deleted. Unpublish it instead.",
    );
  }

  await prisma.$transaction([
    prisma.lesson.deleteMany({ where: { courseId } }),
    prisma.course.delete({ where: { id: courseId } }),
  ]);

  revalidatePath("/courses");
  redirect("/dashboard");
}

export async function deleteQuiz(courseId: string, quizId: string) {
  await requireCourseEditor(courseId);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  if (!quiz || quiz.courseId !== courseId) {
    throw new Error("Quiz not found in this course.");
  }

  await prisma.quiz.delete({ where: { id: quizId } });

  refreshCourse(courseId);
  redirect(`/courses/${courseId}/edit`);
}

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireCourseEditor(courseId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in.");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

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

export async function createQuiz(courseId: string, formData: FormData) {
  await requireCourseEditor(courseId);

  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    throw new Error("Quiz title is required.");
  }

  if (title.length > 120) {
    throw new Error("Quiz title is too long.");
  }

  const quiz = await prisma.quiz.create({
    data: { title, courseId },
  });

  redirect(`/courses/${courseId}/quizzes/${quiz.id}/edit`);
}

export async function addQuestion(
  courseId: string,
  quizId: string,
  formData: FormData,
) {
  await requireCourseEditor(courseId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz || quiz.courseId !== courseId) {
    throw new Error("Quiz not found in this course.");
  }

  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    throw new Error("Question text is required.");
  }

  if (text.length > 500) {
    throw new Error("Question text is too long.");
  }

  const correctIndex = Number(formData.get("correct"));

  const options = [0, 1, 2, 3]
    .map((i) => ({
      index: i,
      text: String(formData.get(`option${i}`) ?? "").trim(),
    }))
    .filter((option) => option.text !== "");

  if (options.length < 2) {
    throw new Error("Provide at least two answer options.");
  }

  if (options.some((option) => option.text.length > 200)) {
    throw new Error("An answer option is too long.");
  }

  if (!options.some((option) => option.index === correctIndex)) {
    throw new Error("Mark one of the filled-in options as correct.");
  }

  const last = await prisma.question.aggregate({
    where: { quizId },
    _max: { order: true },
  });
  const nextOrder = (last._max.order ?? 0) + 1;

  await prisma.question.create({
    data: {
      text,
      order: nextOrder,
      quizId,
      options: {
        create: options.map((option) => ({
          text: option.text,
          isCorrect: option.index === correctIndex,
        })),
      },
    },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}/edit`);
}

export async function deleteQuestion(
  courseId: string,
  quizId: string,
  questionId: string,
) {
  await requireCourseEditor(courseId);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  });

  if (
    !question ||
    question.quizId !== quizId ||
    question.quiz.courseId !== courseId
  ) {
    throw new Error("Question not found.");
  }

  await prisma.question.delete({
    where: { id: questionId },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}/edit`);
}
export async function submitQuiz(
  courseId: string,
  quizId: string,
  formData: FormData,
) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in.");
  }

  if (session.user.role !== "STUDENT") {
    throw new Error("Only students can take quizzes.");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  if (!enrollment) {
    throw new Error("You must be enrolled in this course.");
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { options: true } } },
  });

  if (!quiz || quiz.courseId !== courseId) {
    throw new Error("Quiz not found in this course.");
  }

  const total = quiz.questions.length;

  if (total === 0) {
    throw new Error("This quiz has no questions yet.");
  }

  let score = 0;

  for (const question of quiz.questions) {
    const chosen = formData.get(`q_${question.id}`);
    const correct = question.options.find((option) => option.isCorrect);

    if (correct && chosen === correct.id) {
      score++;
    }
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      score,
      total,
      studentId: session.user.id,
      quizId,
    },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}`);
  redirect(`/courses/${courseId}/quizzes/${quizId}/result/${attempt.id}`);
}

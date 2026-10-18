"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormResult } from "@/lib/form-result";
import {
  LIMITS,
  isQuestionType,
  type QuestionTypeValue,
} from "@/lib/quiz-types";
import {
  gradeQuestion,
  normalizeText,
  round2,
  summarize,
} from "@/lib/quiz-grading";

type Failure = { ok: false; message: string };

function fail(message: string): Failure {
  return { ok: false, message };
}

function fieldText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

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

  const title = fieldText(formData, "title");

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

export async function updateQuizSettings(
  courseId: string,
  quizId: string,
  formData: FormData,
) {
  await requireCourseEditor(courseId);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  if (!quiz || quiz.courseId !== courseId) {
    throw new Error("Quiz not found in this course.");
  }

  const title = fieldText(formData, "title");

  if (!title || title.length > 120) {
    throw new Error("Give the quiz a title of up to 120 characters.");
  }

  await prisma.quiz.update({
    where: { id: quizId },
    data: { title, showAnswers: formData.get("showAnswers") === "on" },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}/edit`);
  revalidatePath(`/courses/${courseId}`);
}

type NewQuestion = {
  type: QuestionTypeValue;
  text: string;
  points: number;
  acceptedAnswers: string[];
  modelAnswer: string | null;
  options: { text: string; isCorrect: boolean }[];
  pairs: { left: string; right: string }[];
};

function readQuestion(
  formData: FormData,
): { ok: true; value: NewQuestion } | Failure {
  const typeValue = fieldText(formData, "type");

  if (!isQuestionType(typeValue)) {
    return fail("Choose a question type.");
  }

  const text = fieldText(formData, "text");

  if (!text) {
    return fail("Write the question.");
  }

  if (text.length > LIMITS.question) {
    return fail(
      `The question is too long (${LIMITS.question} characters at most).`,
    );
  }

  const points = Number(fieldText(formData, "points") || "1");

  if (!Number.isInteger(points) || points < 1 || points > 10) {
    return fail("Points must be a whole number from 1 to 10.");
  }

  const value: NewQuestion = {
    type: typeValue,
    text,
    points,
    acceptedAnswers: [],
    modelAnswer: null,
    options: [],
    pairs: [],
  };

  if (typeValue === "SINGLE_CHOICE") {
    const correctIndex = Number(formData.get("correct"));
    const options = [0, 1, 2, 3]
      .map((i) => ({ index: i, text: fieldText(formData, `option${i}`) }))
      .filter((option) => option.text !== "");

    if (options.length < 2) {
      return fail("Provide at least two answer options.");
    }

    if (options.some((option) => option.text.length > LIMITS.option)) {
      return fail(
        `An answer option is too long (${LIMITS.option} characters at most).`,
      );
    }

    if (
      new Set(options.map((o) => normalizeText(o.text))).size !== options.length
    ) {
      return fail("Each answer option must be different.");
    }

    if (!options.some((option) => option.index === correctIndex)) {
      return fail(
        "Select which answer is correct. It must be one you filled in.",
      );
    }

    value.options = options.map((option) => ({
      text: option.text,
      isCorrect: option.index === correctIndex,
    }));
  }

  if (typeValue === "TRUE_FALSE") {
    const answer = fieldText(formData, "answer");

    if (answer !== "true" && answer !== "false") {
      return fail("Select whether the statement is true or false.");
    }

    value.options = [
      { text: "true", isCorrect: answer === "true" },
      { text: "false", isCorrect: answer === "false" },
    ];
  }

  if (typeValue === "SHORT_ANSWER") {
    const lines = String(formData.get("accepted") ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return fail("List at least one accepted answer.");
    }

    if (lines.length > 10) {
      return fail("List at most 10 accepted answers.");
    }

    if (lines.some((line) => line.length > LIMITS.option)) {
      return fail(
        `An accepted answer is too long (${LIMITS.option} characters at most).`,
      );
    }

    if (lines.some((line) => normalizeText(line) === "")) {
      return fail("An accepted answer must contain letters or numbers.");
    }

    value.acceptedAnswers = Array.from(
      new Map(lines.map((line) => [normalizeText(line), line])).values(),
    );
  }

  if (typeValue === "MATCHING") {
    const pairs: { left: string; right: string }[] = [];

    for (let i = 0; i < 6; i++) {
      const left = fieldText(formData, `left${i}`);
      const right = fieldText(formData, `right${i}`);

      if (!left && !right) continue;

      if (!left || !right) {
        return fail(`Pair ${i + 1} needs both a left item and a right item.`);
      }

      if (left.length > LIMITS.pairItem || right.length > LIMITS.pairItem) {
        return fail(
          `An item is too long (${LIMITS.pairItem} characters at most).`,
        );
      }

      pairs.push({ left, right });
    }

    if (pairs.length < 2) {
      return fail("Provide at least two pairs.");
    }

    const lefts = new Set(pairs.map((pair) => normalizeText(pair.left)));
    const rights = new Set(pairs.map((pair) => normalizeText(pair.right)));

    if (lefts.size !== pairs.length || rights.size !== pairs.length) {
      return fail("Every left item and every right item must be different.");
    }

    value.pairs = pairs;
  }

  if (typeValue === "EXPLANATION") {
    const modelAnswer = fieldText(formData, "modelAnswer");

    if (modelAnswer.length > LIMITS.modelAnswer) {
      return fail(
        `The model answer is too long (${LIMITS.modelAnswer} characters at most).`,
      );
    }

    value.modelAnswer = modelAnswer || null;
  }

  return { ok: true, value };
}

export async function addQuestion(
  courseId: string,
  quizId: string,
  formData: FormData,
): Promise<FormResult> {
  await requireCourseEditor(courseId);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  if (!quiz || quiz.courseId !== courseId) {
    throw new Error("Quiz not found in this course.");
  }

  const parsed = readQuestion(formData);

  if (!parsed.ok) {
    return parsed;
  }

  const question = parsed.value;

  const last = await prisma.question.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  await prisma.question.create({
    data: {
      text: question.text,
      type: question.type,
      points: question.points,
      acceptedAnswers: question.acceptedAnswers,
      modelAnswer: question.modelAnswer,
      order: (last._max.order ?? 0) + 1,
      quizId,
      options: { create: question.options },
      pairs: {
        create: question.pairs.map((pair, index) => ({
          left: pair.left,
          right: pair.right,
          order: index + 1,
        })),
      },
    },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}/edit`);
  return { ok: true };
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

  const attempts = await prisma.quizAttempt.count({ where: { quizId } });

  if (attempts > 0) {
    throw new Error(
      "This quiz already has student attempts, so its questions can no longer be deleted.",
    );
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
    include: {
      course: { select: { published: true } },
      questions: {
        orderBy: { order: "asc" },
        include: { options: true, pairs: true },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId || !quiz.course.published) {
    throw new Error("Quiz not found in this course.");
  }

  if (quiz.questions.length === 0) {
    throw new Error("This quiz has no questions yet.");
  }

  const read = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : null;
  };

  const graded = quiz.questions.map((question) => ({
    question,
    result: gradeQuestion(
      {
        id: question.id,
        type: question.type,
        points: question.points,
        acceptedAnswers: question.acceptedAnswers,
        options: question.options.map((option) => ({
          id: option.id,
          isCorrect: option.isCorrect,
        })),
        pairs: question.pairs.map((pair) => ({
          id: pair.id,
          right: pair.right,
        })),
      },
      read,
    ),
  }));

  const { score, total, pending } = summarize(
    quiz.questions,
    graded.map((item) => item.result),
  );

  const attempt = await prisma.quizAttempt.create({
    data: {
      score,
      total,
      status: pending ? "PENDING" : "GRADED",
      gradedAt: pending ? null : new Date(),
      studentId: session.user.id,
      quizId,
      answers: {
        createMany: {
          data: graded.map((item) => ({
            questionId: item.question.id,
            response: item.result.response,
            isCorrect: item.result.isCorrect,
            points: item.result.points,
          })),
        },
      },
    },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}`);
  redirect(`/courses/${courseId}/quizzes/${quizId}/result/${attempt.id}`);
}

export async function gradeAnswer(
  courseId: string,
  quizId: string,
  answerId: string,
  formData: FormData,
): Promise<FormResult> {
  await requireCourseEditor(courseId);

  const answer = await prisma.attemptAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: { select: { type: true, points: true } },
      attempt: { select: { id: true, quizId: true } },
    },
  });

  if (
    !answer ||
    answer.attempt.quizId !== quizId ||
    answer.question.type !== "EXPLANATION"
  ) {
    throw new Error("Answer not found.");
  }

  const points = Number(fieldText(formData, "points"));

  if (
    !Number.isFinite(points) ||
    points < 0 ||
    points > answer.question.points
  ) {
    return fail(`Give a mark from 0 to ${answer.question.points}.`);
  }

  const feedback = fieldText(formData, "feedback");

  if (feedback.length > LIMITS.feedback) {
    return fail(
      `The feedback is too long (${LIMITS.feedback} characters at most).`,
    );
  }

  await prisma.attemptAnswer.update({
    where: { id: answerId },
    data: {
      points: round2(points),
      isCorrect: points >= answer.question.points,
      feedback: feedback || null,
    },
  });

  const attemptId = answer.attempt.id;

  const [sum, waiting] = await Promise.all([
    prisma.attemptAnswer.aggregate({
      where: { attemptId },
      _sum: { points: true },
    }),
    prisma.attemptAnswer.count({ where: { attemptId, isCorrect: null } }),
  ]);

  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score: round2(sum._sum.points ?? 0),
      status: waiting > 0 ? "PENDING" : "GRADED",
      gradedAt: waiting > 0 ? null : new Date(),
    },
  });

  revalidatePath(`/courses/${courseId}/quizzes/${quizId}/grading`);
  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

import { randomInt } from "node:crypto";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDateTime } from "@/lib/dates";
import { trueFalseLabel, type QuestionTypeValue } from "@/lib/quiz-types";
import { submitQuiz } from "@/app/courses/quiz-actions";

type TakeQuestion = {
  id: string;
  text: string;
  type: QuestionTypeValue;
  points: number;
  options: { id: string; text: string }[];
  pairs: { id: string; left: string; right: string }[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

const INSTRUCTIONS: Record<QuestionTypeValue, string> = {
  SINGLE_CHOICE: "Choose one answer.",
  TRUE_FALSE: "Choose true or false.",
  SHORT_ANSWER: "Type a short answer.",
  MATCHING: "Match each item on the left with the correct item.",
  EXPLANATION:
    "Write your answer in your own words. Your teacher will read it and give you a mark.",
};

function QuestionField({
  question,
  index,
}: {
  question: TakeQuestion;
  index: number;
}) {
  const name = `q_${question.id}`;
  const lefts = question.pairs.map((pair) => ({
    id: pair.id,
    left: pair.left,
  }));
  const rights =
    question.type === "MATCHING"
      ? shuffle(Array.from(new Set(question.pairs.map((pair) => pair.right))))
      : [];
  const choices =
    question.type === "TRUE_FALSE"
      ? [...question.options].sort((a, b) =>
          a.text === b.text ? 0 : a.text === "true" ? -1 : 1,
        )
      : question.options;

  return (
    <fieldset>
      <legend className="font-display text-xl font-semibold leading-snug">
        {index + 1}. {question.text}
      </legend>
      <p className="mt-1 text-sm text-muted">
        {INSTRUCTIONS[question.type]} {question.points}{" "}
        {question.points === 1 ? "point." : "points."}
      </p>

      {(question.type === "SINGLE_CHOICE" ||
        question.type === "TRUE_FALSE") && (
        <div className="mt-4 space-y-2">
          {choices.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-3 border border-rule bg-white px-4 py-3 hover:border-ink has-checked:border-lapis has-checked:bg-lapis/5"
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                className="mt-1 h-4 w-4 shrink-0 accent-lapis"
              />
              <span>
                {question.type === "TRUE_FALSE"
                  ? trueFalseLabel(option.text)
                  : option.text}
              </span>
            </label>
          ))}
        </div>
      )}

      {question.type === "SHORT_ANSWER" && (
        <div className="mt-4">
          <label htmlFor={name} className="sr-only">
            Your answer to question {index + 1}
          </label>
          <input
            id={name}
            name={name}
            type="text"
            maxLength={300}
            autoComplete="off"
            className="field"
          />
        </div>
      )}

      {question.type === "MATCHING" && (
        <ul className="mt-4 space-y-3">
          {lefts.map((item) => (
            <li
              key={item.id}
              className="grid gap-2 border border-rule bg-white p-3 sm:grid-cols-2 sm:items-center"
            >
              <label
                htmlFor={`m_${question.id}_${item.id}`}
                className="font-bold"
              >
                {item.left}
              </label>
              <select
                id={`m_${question.id}_${item.id}`}
                name={`m_${question.id}_${item.id}`}
                defaultValue=""
                className="field"
              >
                <option value="">Choose a match</option>
                {rights.map((right) => (
                  <option key={right} value={right}>
                    {right}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {question.type === "EXPLANATION" && (
        <div className="mt-4">
          <label htmlFor={name} className="sr-only">
            Your answer to question {index + 1}
          </label>
          <textarea
            id={name}
            name={name}
            rows={6}
            maxLength={5000}
            className="field"
          />
        </div>
      )}
    </fieldset>
  );
}

export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { title: true, teacherId: true, published: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          type: true,
          points: true,
          options: {
            select: { id: true, text: true },
            orderBy: { id: "asc" },
          },
          pairs: {
            select: { id: true, left: true, right: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!quiz || quiz.courseId !== id) {
    notFound();
  }

  const isOwner = session.user.id === quiz.course.teacherId;
  const isAdmin = session.user.role === "ADMIN";

  if (isOwner || isAdmin) {
    redirect(`/courses/${id}/quizzes/${quizId}/edit`);
  }

  if (!quiz.course.published) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId: id,
      },
    },
  });

  if (!enrollment) {
    redirect(`/courses/${id}`);
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: session.user.id, quizId },
    orderBy: { completedAt: "desc" },
  });

  const submitThisQuiz = submitQuiz.bind(null, id, quizId);
  const questionCount = quiz.questions.length;
  const hasWritten = quiz.questions.some(
    (question) => question.type === "EXPLANATION",
  );
  const totalPoints = quiz.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href={`/courses/${id}`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Back to {quiz.course.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
        {quiz.title}
      </h1>
      <p className="mt-2 text-muted">
        {questionCount} {questionCount === 1 ? "question" : "questions"},{" "}
        {totalPoints} {totalPoints === 1 ? "point" : "points"}. You can retake
        this quiz as often as you like.
        {hasWritten &&
          " It has written answers, so your final score is ready after your teacher has read them."}
      </p>

      {attempts.length > 0 && (
        <details className="mt-6 border border-rule bg-white">
          <summary className="cursor-pointer px-4 py-3 font-bold">
            Previous attempts ({attempts.length})
          </summary>
          <ul className="divide-y divide-rule border-t border-rule text-sm">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex justify-between gap-4 px-4 py-2"
              >
                <Link
                  href={`/courses/${id}/quizzes/${quizId}/result/${attempt.id}`}
                  className="font-bold text-lapis underline underline-offset-4"
                >
                  {attempt.score} of {attempt.total}
                  {attempt.status === "PENDING" ? " (waiting for review)" : ""}
                </Link>
                <span className="text-muted">
                  {formatDateTime(attempt.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {questionCount === 0 ? (
        <p className="mt-8 border border-dashed border-rule bg-white p-8 text-center text-muted">
          This quiz has no questions yet. Check back later.
        </p>
      ) : (
        <form action={submitThisQuiz} className="mt-8 space-y-10">
          {quiz.questions.map((question, index) => (
            <QuestionField
              key={question.id}
              question={question}
              index={index}
            />
          ))}

          <div>
            <button type="submit" className="btn btn-primary">
              Submit answers
            </button>
            <p className="mt-2 text-sm text-muted">
              Questions you leave blank count as wrong. You will see your score
              right away.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

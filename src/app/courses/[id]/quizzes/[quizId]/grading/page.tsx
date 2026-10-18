import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDateTime } from "@/lib/dates";
import { gradeAnswer } from "@/app/courses/quiz-actions";
import GradeForm from "@/components/GradeForm";

export const metadata: Metadata = { title: "Mark written answers" };

const SHOWN = 50;

export default async function GradingPage({
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
    include: { course: { select: { title: true, teacherId: true } } },
  });

  if (!quiz || quiz.courseId !== id) {
    notFound();
  }

  const isOwner = session.user.id === quiz.course.teacherId;

  if (!isOwner && session.user.role !== "ADMIN") {
    redirect("/courses");
  }

  const include = {
    question: { select: { text: true, points: true, modelAnswer: true } },
    attempt: {
      select: {
        completedAt: true,
        student: { select: { name: true } },
      },
    },
  } as const;

  const [waiting, waitingTotal, marked] = await Promise.all([
    prisma.attemptAnswer.findMany({
      where: {
        isCorrect: null,
        attempt: { quizId },
        question: { type: "EXPLANATION" },
      },
      orderBy: { attempt: { completedAt: "asc" } },
      take: SHOWN,
      include,
    }),
    prisma.attemptAnswer.count({
      where: {
        isCorrect: null,
        attempt: { quizId },
        question: { type: "EXPLANATION" },
      },
    }),
    prisma.attemptAnswer.findMany({
      where: {
        isCorrect: { not: null },
        response: { not: "" },
        attempt: { quizId },
        question: { type: "EXPLANATION" },
      },
      orderBy: { attempt: { completedAt: "desc" } },
      take: 20,
      include,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href={`/courses/${id}/quizzes/${quizId}/edit`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Back to {quiz.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
        Mark written answers
      </h1>
      <p className="mt-2 text-muted">
        {quiz.title} in {quiz.course.title}.{" "}
        {waitingTotal === 0
          ? "Nothing is waiting for your mark."
          : `${waitingTotal} ${
              waitingTotal === 1 ? "answer is" : "answers are"
            } waiting.`}
      </p>

      {waiting.length > 0 && (
        <ul className="mt-8 space-y-6">
          {waiting.map((item) => (
            <li key={item.id} className="border border-rule bg-white p-5">
              <p className="text-sm text-muted">
                {item.attempt.student.name}, submitted{" "}
                {formatDateTime(item.attempt.completedAt)}
              </p>
              <p className="mt-2 font-display text-lg font-semibold leading-snug">
                {item.question.text}
              </p>

              <p className="mt-4 text-sm font-bold">Student&apos;s answer</p>
              <p className="mt-1 whitespace-pre-line border-l-4 border-rule bg-paper px-4 py-3">
                {item.response}
              </p>

              {item.question.modelAnswer && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-bold">
                    Your model answer
                  </summary>
                  <p className="mt-2 whitespace-pre-line">
                    {item.question.modelAnswer}
                  </p>
                </details>
              )}

              <div className="mt-5 border-t border-rule pt-5">
                <GradeForm
                  action={gradeAnswer.bind(null, id, quizId, item.id)}
                  maxPoints={item.question.points}
                  initialPoints={null}
                  initialFeedback=""
                  label={item.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {waitingTotal > SHOWN && (
        <p className="mt-4 text-sm text-muted">
          Showing the oldest {SHOWN}. The rest appear as you mark these.
        </p>
      )}

      {marked.length > 0 && (
        <section className="mt-12" aria-labelledby="marked-heading">
          <h2
            id="marked-heading"
            className="font-display text-2xl font-semibold"
          >
            Recently marked
          </h2>
          <p className="mt-1 text-sm text-muted">
            You can change a mark or feedback here. The student&apos;s score
            updates straight away.
          </p>
          <ul className="mt-4 space-y-3">
            {marked.map((item) => (
              <li key={item.id} className="border border-rule bg-white">
                <details>
                  <summary className="cursor-pointer px-5 py-4">
                    <span className="font-bold">
                      {item.attempt.student.name}
                    </span>
                    <span className="text-muted">
                      , {item.points} of {item.question.points}.{" "}
                    </span>
                    <span className="text-muted">{item.question.text}</span>
                  </summary>
                  <div className="border-t border-rule px-5 py-5">
                    <p className="whitespace-pre-line border-l-4 border-rule bg-paper px-4 py-3">
                      {item.response}
                    </p>
                    <div className="mt-5">
                      <GradeForm
                        action={gradeAnswer.bind(null, id, quizId, item.id)}
                        maxPoints={item.question.points}
                        initialPoints={item.points}
                        initialFeedback={item.feedback ?? ""}
                        label={item.id}
                      />
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

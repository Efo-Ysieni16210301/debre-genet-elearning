import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { submitQuiz } from "@/app/courses/quiz-actions";

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
        include: {
          options: {
            select: { id: true, text: true },
            orderBy: { id: "asc" },
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
        {questionCount} {questionCount === 1 ? "question" : "questions"}. Choose
        one answer for each question. You can retake this quiz as often as you
        like.
      </p>

      {attempts.length > 0 && (
        <details className="mt-6 border border-rule bg-white">
          <summary className="cursor-pointer px-4 py-3 font-bold">
            Previous attempts ({attempts.length})
          </summary>
          <ul className="divide-y divide-rule border-t border-rule text-sm">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex justify-between px-4 py-2">
                <span className="font-bold">
                  {attempt.score} of {attempt.total}
                </span>
                <span className="text-muted">
                  {attempt.completedAt.toLocaleString("en-GB", {
                    timeZone: "Africa/Addis_Ababa",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
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
        <form action={submitThisQuiz} className="mt-8 space-y-8">
          {quiz.questions.map((question, index) => (
            <fieldset key={question.id}>
              <legend className="font-display text-xl font-semibold leading-snug">
                {index + 1}. {question.text}
              </legend>

              <div className="mt-4 space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 border border-rule bg-white px-4 py-3 hover:border-ink has-checked:border-lapis has-checked:bg-lapis/5"
                  >
                    <input
                      type="radio"
                      name={`q_${question.id}`}
                      value={option.id}
                      required={optionIndex === 0}
                      className="mt-1 h-4 w-4 shrink-0 accent-lapis"
                    />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div>
            <button type="submit" className="btn btn-primary">
              Submit answers
            </button>
            <p className="mt-2 text-sm text-muted">
              You will see your score right away.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

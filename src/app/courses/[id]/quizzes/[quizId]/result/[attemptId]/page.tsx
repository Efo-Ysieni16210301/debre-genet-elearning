import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string; attemptId: string }>;
}) {
  const { id, quizId, attemptId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { select: { title: true, courseId: true } } },
  });

  if (
    !attempt ||
    attempt.quizId !== quizId ||
    attempt.quiz.courseId !== id ||
    attempt.studentId !== session.user.id
  ) {
    notFound();
  }

  const percent =
    attempt.total === 0 ? 0 : Math.round((attempt.score / attempt.total) * 100);

  const message =
    percent >= 80
      ? "Well done. You know this material well."
      : percent >= 50
        ? "Good effort. Read the lessons again, then try the quiz once more."
        : "Keep going. Review the lessons, then retake the quiz when you are ready.";

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="border border-rule bg-white p-8">
        <p className="text-sm text-muted">{attempt.quiz.title}</p>

        <p className="mt-4 font-display text-6xl font-semibold leading-none">
          {attempt.score}
          <span className="ml-3 text-3xl text-muted">of {attempt.total}</span>
        </p>
        <p className="mt-2 text-lg text-muted">{percent}% correct</p>

        {attempt.total <= 20 && (
          <div aria-hidden="true" className="mt-5 flex flex-wrap gap-1.5">
            {Array.from({ length: attempt.total }, (_, i) => (
              <span
                key={i}
                className={`h-3 w-3 ${i < attempt.score ? "bg-fern" : "bg-rule"}`}
              />
            ))}
          </div>
        )}

        <p className="mt-6">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/courses/${id}/quizzes/${quizId}`}
            className="btn btn-primary"
          >
            Retake quiz
          </Link>
          <Link href={`/courses/${id}`} className="btn btn-ghost">
            Back to course
          </Link>
        </div>
      </div>
    </div>
  );
}

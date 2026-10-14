import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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

  return (
    <div className="min-h-screen p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">{attempt.quiz.title}</h1>
      <p className="text-gray-500 mb-8">Your result</p>

      <p className="text-5xl font-bold mb-2">
        {attempt.score} / {attempt.total}
      </p>
      <p className="text-xl text-gray-600 mb-8">{percent}%</p>

      <div className="flex justify-center gap-4 text-sm">
        <Link
          href={`/courses/${id}/quizzes/${quizId}`}
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          Retake quiz
        </Link>
        <Link
          href={`/courses/${id}`}
          className="border px-4 py-2 rounded font-medium hover:bg-gray-50"
        >
          Back to course
        </Link>
      </div>
    </div>
  );
}

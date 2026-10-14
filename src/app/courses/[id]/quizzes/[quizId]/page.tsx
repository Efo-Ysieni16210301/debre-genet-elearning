import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
      course: { select: { teacherId: true, published: true } },
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

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link href={`/courses/${id}`} className="text-sm text-blue-600 underline">
        ← Back to course
      </Link>

      <h1 className="text-2xl font-bold mt-3 mb-6">{quiz.title}</h1>

      {attempts.length > 0 && (
        <div className="mb-8 border rounded p-4 text-sm">
          <h2 className="font-semibold mb-2">Your previous attempts</h2>
          <ul className="space-y-1">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                {attempt.score} / {attempt.total} on{" "}
                {attempt.completedAt.toLocaleString("en-GB", {
                  timeZone: "Africa/Addis_Ababa",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quiz.questions.length === 0 ? (
        <p className="text-gray-500">This quiz has no questions yet.</p>
      ) : (
        <form action={submitThisQuiz} className="space-y-6">
          {quiz.questions.map((question) => (
            <fieldset key={question.id} className="border rounded p-4">
              <legend className="font-medium px-1">
                {question.order}. {question.text}
              </legend>
              <div className="mt-2 space-y-2">
                {question.options.map((option, index) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={`q_${question.id}`}
                      value={option.id}
                      required={index === 0}
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
          >
            Submit Quiz
          </button>
        </form>
      )}
    </div>
  );
}

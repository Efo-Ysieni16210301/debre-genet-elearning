import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { addQuestion, deleteQuestion } from "@/app/courses/quiz-actions";

export default async function EditQuizPage({
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
      course: true,
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { id: "asc" } } },
      },
    },
  });

  if (!quiz || quiz.courseId !== id) {
    notFound();
  }

  const isOwner = session.user.id === quiz.course.teacherId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/courses");
  }

  const addQuestionHere = addQuestion.bind(null, id, quizId);

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link
        href={`/courses/${id}/edit`}
        className="text-sm text-blue-600 underline"
      >
        ← Back to course
      </Link>

      <h1 className="text-2xl font-bold mt-3 mb-1">{quiz.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {quiz.questions.length} questions
      </p>

      <ul className="space-y-4 mb-10">
        {quiz.questions.map((question) => (
          <li key={question.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-3">
              <p className="font-medium">
                {question.order}. {question.text}
              </p>
              <form action={deleteQuestion.bind(null, id, quizId, question.id)}>
                <button
                  type="submit"
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </form>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {question.options.map((option) => (
                <li
                  key={option.id}
                  className={option.isCorrect ? "text-green-700" : ""}
                >
                  {option.isCorrect ? "✓ " : "• "}
                  {option.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h2 className="text-lg font-semibold mb-3">Add a Question</h2>
      <form action={addQuestionHere} className="space-y-3">
        <textarea
          name="text"
          required
          rows={2}
          maxLength={500}
          placeholder="Question text"
          className="w-full border rounded px-3 py-2"
        />

        <p className="text-sm text-gray-600">
          Fill in at least two answers, and select the correct one.
        </p>

        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" value={i} required={i === 0} />
            <input
              type="text"
              name={`option${i}`}
              required={i < 2}
              maxLength={200}
              placeholder={`Answer ${i + 1}${i < 2 ? "" : " (optional)"}`}
              className="flex-1 border rounded px-3 py-2"
            />
          </div>
        ))}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          Add Question
        </button>
      </form>
    </div>
  );
}

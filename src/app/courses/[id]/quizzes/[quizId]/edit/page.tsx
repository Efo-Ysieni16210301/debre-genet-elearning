import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { addQuestion, deleteQuestion } from "@/app/courses/quiz-actions";
import { deleteQuiz } from "@/app/courses/manage-actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Edit quiz" };

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

  const questionCount = quiz.questions.length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href={`/courses/${id}/edit`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Back to {quiz.course.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
        {quiz.title}
      </h1>
      <p className="mt-2 text-muted">
        {questionCount} {questionCount === 1 ? "question" : "questions"}.
        Students can take the quiz once it has at least one question.
      </p>

      {questionCount > 0 && (
        <ol className="mt-8 space-y-4">
          {quiz.questions.map((question, index) => (
            <li key={question.id} className="border border-rule bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-display text-lg font-semibold leading-snug">
                  {index + 1}. {question.text}
                </p>
                <form
                  action={deleteQuestion.bind(null, id, quizId, question.id)}
                >
                  <SubmitButton
                    className="btn btn-ghost btn-sm text-madder"
                    pendingText="Deleting..."
                    confirmMessage="Delete this question?"
                  >
                    Delete
                    <span className="sr-only"> question {index + 1}</span>
                  </SubmitButton>
                </form>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {question.options.map((option) => (
                  <li key={option.id} className="flex gap-3">
                    <span
                      className={
                        option.isCorrect
                          ? "w-16 shrink-0 font-bold text-fern"
                          : "w-16 shrink-0 text-muted"
                      }
                    >
                      {option.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                    <span>{option.text}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <h2 className="mt-12 font-display text-2xl font-semibold">
        Add a question
      </h2>
      <form
        action={addQuestion.bind(null, id, quizId)}
        className="mt-4 space-y-4 border border-rule bg-white p-5"
      >
        <div>
          <label
            htmlFor="question-text"
            className="mb-1.5 block text-sm font-bold"
          >
            Question
          </label>
          <textarea
            id="question-text"
            name="text"
            required
            rows={2}
            maxLength={500}
            className="field"
          />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-bold">Answers</legend>
          <p className="mb-3 text-sm text-muted">
            Fill in at least two answers, then select the correct one.
          </p>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct"
                  value={i}
                  required={i === 0}
                  aria-label={`Answer ${i + 1} is the correct one`}
                  className="h-4 w-4 shrink-0 accent-lapis"
                />
                <input
                  type="text"
                  name={`option${i}`}
                  required={i < 2}
                  maxLength={200}
                  aria-label={`Answer ${i + 1}`}
                  placeholder={`Answer ${i + 1}${i < 2 ? "" : " (optional)"}`}
                  className="field"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <SubmitButton pendingText="Adding...">Add question</SubmitButton>
      </form>

      <div className="mt-12 border border-madder/40 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-madder">
          Delete quiz
        </h2>
        <p className="mt-2 text-sm text-muted">
          This removes the quiz, its questions and every student&apos;s
          attempts. It cannot be undone.
        </p>
        <form action={deleteQuiz.bind(null, id, quizId)}>
          <SubmitButton
            className="btn btn-danger btn-sm mt-4"
            pendingText="Deleting..."
            confirmMessage="Delete this quiz with all its questions and students' attempts? This cannot be undone."
          >
            Delete quiz
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

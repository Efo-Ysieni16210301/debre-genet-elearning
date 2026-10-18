import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  addQuestion,
  deleteQuestion,
  updateQuizSettings,
} from "@/app/courses/quiz-actions";
import { deleteQuiz } from "@/app/courses/manage-actions";
import { trueFalseLabel, typeLabel } from "@/lib/quiz-types";
import QuestionForm from "@/components/QuestionForm";
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
        include: {
          options: { orderBy: { id: "asc" } },
          pairs: { orderBy: { order: "asc" } },
        },
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

  const [attemptCount, waitingCount] = await Promise.all([
    prisma.quizAttempt.count({ where: { quizId } }),
    prisma.attemptAnswer.count({
      where: { isCorrect: null, attempt: { quizId } },
    }),
  ]);

  const questionCount = quiz.questions.length;
  const totalPoints = quiz.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

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
        {questionCount} {questionCount === 1 ? "question" : "questions"},{" "}
        {totalPoints} {totalPoints === 1 ? "point" : "points"} in total.
        Students can take the quiz once it has at least one question.
      </p>

      {waitingCount > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-saffron bg-saffron/15 px-4 py-3">
          <p className="text-sm">
            {waitingCount} written{" "}
            {waitingCount === 1 ? "answer is" : "answers are"} waiting for your
            mark.
          </p>
          <Link
            href={`/courses/${id}/quizzes/${quizId}/grading`}
            className="btn btn-primary btn-sm"
          >
            Mark written answers
          </Link>
        </div>
      )}

      {attemptCount > 0 && waitingCount === 0 && (
        <p className="mt-6 text-sm">
          <Link
            href={`/courses/${id}/quizzes/${quizId}/grading`}
            className="font-bold text-lapis underline underline-offset-4"
          >
            Review marked written answers
          </Link>
        </p>
      )}

      <form
        action={updateQuizSettings.bind(null, id, quizId)}
        className="mt-8 space-y-4 border border-rule bg-white p-5"
      >
        <h2 className="font-display text-lg font-semibold">Quiz settings</h2>
        <div>
          <label
            htmlFor="quiz-title"
            className="mb-1.5 block text-sm font-bold"
          >
            Title
          </label>
          <input
            id="quiz-title"
            name="title"
            defaultValue={quiz.title}
            required
            maxLength={120}
            className="field"
          />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="showAnswers"
            defaultChecked={quiz.showAnswers}
            className="mt-1 h-4 w-4 accent-lapis"
          />
          <span>
            <span className="font-bold">
              Show correct answers after submitting
            </span>
            <span className="block text-muted">
              Off by default. When it is off, students see their marks and your
              feedback, but not the right answers, so they cannot simply copy
              them into a retake.
            </span>
          </span>
        </label>
        <SubmitButton className="btn btn-primary btn-sm">
          Save settings
        </SubmitButton>
      </form>

      {questionCount > 0 && (
        <ol className="mt-10 space-y-4">
          {quiz.questions.map((question, index) => (
            <li key={question.id} className="border border-rule bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">
                    {typeLabel(question.type)}, {question.points}{" "}
                    {question.points === 1 ? "point" : "points"}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold leading-snug">
                    {index + 1}. {question.text}
                  </p>
                </div>
                {attemptCount === 0 && (
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
                )}
              </div>

              {(question.type === "SINGLE_CHOICE" ||
                question.type === "TRUE_FALSE") && (
                <ul className="mt-3 space-y-1 text-sm">
                  {[...question.options]
                    .sort((a, b) =>
                      question.type === "TRUE_FALSE" && a.text !== b.text
                        ? a.text === "true"
                          ? -1
                          : 1
                        : 0,
                    )
                    .map((option) => (
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
                        <span>
                          {question.type === "TRUE_FALSE"
                            ? trueFalseLabel(option.text)
                            : option.text}
                        </span>
                      </li>
                    ))}
                </ul>
              )}

              {question.type === "SHORT_ANSWER" && (
                <p className="mt-3 text-sm">
                  <span className="text-muted">Accepted answers: </span>
                  {question.acceptedAnswers.join(", ")}
                </p>
              )}

              {question.type === "MATCHING" && (
                <ul className="mt-3 space-y-1 text-sm">
                  {question.pairs.map((pair) => (
                    <li key={pair.id}>
                      {pair.left}
                      <span className="text-muted"> matches </span>
                      {pair.right}
                    </li>
                  ))}
                </ul>
              )}

              {question.type === "EXPLANATION" && (
                <p className="mt-3 whitespace-pre-line text-sm">
                  <span className="text-muted">Model answer: </span>
                  {question.modelAnswer ?? "None given."}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {attemptCount > 0 && (
        <p className="mt-6 border-l-4 border-saffron bg-saffron/15 px-4 py-3 text-sm">
          Students have already taken this quiz, so existing questions cannot be
          deleted. You can still add questions, and they count for later
          attempts. To start over, create a new quiz.
        </p>
      )}

      <h2 className="mt-12 font-display text-2xl font-semibold">
        Add a question
      </h2>
      <div className="mt-4 border border-rule bg-white p-5">
        <QuestionForm action={addQuestion.bind(null, id, quizId)} />
      </div>

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

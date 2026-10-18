import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { trueFalseLabel } from "@/lib/quiz-types";
import ProgressBar from "@/components/ProgressBar";

type ReviewQuestion = {
  type:
    | "SINGLE_CHOICE"
    | "TRUE_FALSE"
    | "SHORT_ANSWER"
    | "MATCHING"
    | "EXPLANATION";
  points: number;
  acceptedAnswers: string[];
  modelAnswer: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
  pairs: { id: string; left: string; right: string }[];
};

function optionText(question: ReviewQuestion, text: string) {
  return question.type === "TRUE_FALSE" ? trueFalseLabel(text) : text;
}

function yourAnswer(question: ReviewQuestion, response: string) {
  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    const option = question.options.find((item) => item.id === response);
    return option ? optionText(question, option.text) : "No answer";
  }

  if (question.type === "MATCHING") {
    let chosen: Record<string, string> = {};

    try {
      chosen = JSON.parse(response) as Record<string, string>;
    } catch {
      chosen = {};
    }

    return question.pairs
      .map((pair) => `${pair.left}: ${chosen[pair.id] || "no answer"}`)
      .join("\n");
  }

  return response || "No answer";
}

function correctAnswer(question: ReviewQuestion) {
  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    const option = question.options.find((item) => item.isCorrect);
    return option ? optionText(question, option.text) : null;
  }

  if (question.type === "SHORT_ANSWER") {
    return question.acceptedAnswers.join(", ");
  }

  if (question.type === "MATCHING") {
    return question.pairs
      .map((pair) => `${pair.left}: ${pair.right}`)
      .join("\n");
  }

  return question.modelAnswer;
}

function verdict(isCorrect: boolean | null, points: number, max: number) {
  if (isCorrect === null) return "Waiting for review";
  if (points >= max) return "Correct";
  if (points > 0) return "Partly correct";
  return "Incorrect";
}

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
    include: {
      quiz: { select: { title: true, courseId: true, showAnswers: true } },
      answers: {
        include: {
          question: {
            include: {
              options: { orderBy: { id: "asc" } },
              pairs: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
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
  const waiting = attempt.status === "PENDING";
  const showAnswers = attempt.quiz.showAnswers;
  const answers = [...attempt.answers].sort(
    (a, b) => a.question.order - b.question.order,
  );

  const message = waiting
    ? "Your teacher still needs to read your written answers. The score above does not include them yet and will update when they are marked."
    : percent >= 80
      ? "Well done. You know this material well."
      : percent >= 50
        ? "Good effort. Read the lessons again, then try the quiz once more."
        : "Keep going. Review the lessons, then retake the quiz when you are ready.";

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="border border-rule bg-white p-8">
        <p className="text-sm text-muted">{attempt.quiz.title}</p>

        <p className="mt-4 font-display text-6xl font-semibold leading-none">
          {attempt.score}
          <span className="ml-3 text-3xl text-muted">of {attempt.total}</span>
        </p>
        <p className="mt-2 text-lg text-muted">
          {percent}% {waiting ? "so far" : "correct"}
        </p>

        <div className="mt-5 max-w-xs">
          <ProgressBar
            value={attempt.score}
            max={attempt.total}
            label={`Score in ${attempt.quiz.title}`}
          />
        </div>

        <p
          role={waiting ? "status" : undefined}
          className={`mt-6 ${
            waiting ? "border-l-4 border-saffron bg-saffron/15 px-3 py-2" : ""
          }`}
        >
          {message}
        </p>

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

      {answers.length > 0 && (
        <section className="mt-10" aria-labelledby="review-heading">
          <h2
            id="review-heading"
            className="font-display text-2xl font-semibold"
          >
            Your answers
          </h2>
          <ol className="mt-4 space-y-4">
            {answers.map((answer, index) => {
              const question = answer.question;
              const right = showAnswers ? correctAnswer(question) : null;

              return (
                <li key={answer.id} className="border border-rule bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold leading-snug">
                      {index + 1}. {question.text}
                    </p>
                    <p className="text-sm font-bold">
                      {verdict(
                        answer.isCorrect,
                        answer.points,
                        question.points,
                      )}
                      <span className="font-normal text-muted">
                        , {answer.isCorrect === null ? 0 : answer.points} of{" "}
                        {question.points}
                      </span>
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-muted">Your answer</p>
                  <p className="whitespace-pre-line">
                    {yourAnswer(question, answer.response)}
                  </p>

                  {answer.feedback && (
                    <div className="mt-4 border-l-4 border-lapis bg-lapis/5 px-4 py-3">
                      <p className="text-sm font-bold">Your teacher says</p>
                      <p className="mt-1 whitespace-pre-line text-sm">
                        {answer.feedback}
                      </p>
                    </div>
                  )}

                  {right && (
                    <div className="mt-4 text-sm">
                      <p className="text-muted">
                        {question.type === "EXPLANATION"
                          ? "Model answer"
                          : "Correct answer"}
                      </p>
                      <p className="whitespace-pre-line">{right}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

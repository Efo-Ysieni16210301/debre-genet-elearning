import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { enrollInCourse, toggleLessonComplete } from "../actions";
import { spineFor } from "@/lib/spine";
import LessonPlayer from "@/components/LessonPlayer";
import ProgressBar from "@/components/ProgressBar";

type PageProps = { params: Promise<{ id: string }> };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 text-fern"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { title: true, published: true },
  });

  return { title: course?.published ? course.title : "Course" };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      lessons: { orderBy: { order: "asc" } },
      quizzes: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const role = session?.user.role;
  const isOwner = session?.user.id === course.teacherId;
  const isStaff = isOwner || role === "ADMIN";

  if (!course.published && !isStaff) {
    notFound();
  }

  let isEnrolled = false;
  let completedLessonIds = new Set<string>();
  let watchedLessonIds = new Set<string>();
  const bestByQuiz = new Map<string, { score: number; total: number }>();

  if (session) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId: course.id,
        },
      },
    });
    isEnrolled = !!enrollment;

    if (isEnrolled) {
      const [progress, watches, attempts] = await Promise.all([
        prisma.lessonProgress.findMany({
          where: {
            studentId: session.user.id,
            lesson: { courseId: course.id },
          },
          select: { lessonId: true },
        }),
        prisma.videoWatch.findMany({
          where: {
            studentId: session.user.id,
            finishedAt: { not: null },
            lesson: { courseId: course.id },
          },
          select: { lessonId: true },
        }),
        prisma.quizAttempt.findMany({
          where: {
            studentId: session.user.id,
            quiz: { courseId: course.id },
          },
          select: { quizId: true, score: true, total: true },
        }),
      ]);

      completedLessonIds = new Set(progress.map((p) => p.lessonId));
      watchedLessonIds = new Set(watches.map((w) => w.lessonId));

      for (const attempt of attempts) {
        if (attempt.total === 0) continue;
        const current = bestByQuiz.get(attempt.quizId);
        if (
          !current ||
          attempt.score / attempt.total > current.score / current.total
        ) {
          bestByQuiz.set(attempt.quizId, {
            score: attempt.score,
            total: attempt.total,
          });
        }
      }
    }
  }

  const canViewContent = isEnrolled || isStaff;
  const takeableQuizzes = course.quizzes.filter(
    (quiz) => quiz._count.questions > 0,
  );
  const totalLessons = course.lessons.length;
  const completedCount = completedLessonIds.size;

  return (
    <>
      <header className="border-b border-rule bg-white">
        <div aria-hidden className={`h-2 ${spineFor(course.id)}`} />
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Link
            href="/courses"
            className="text-sm font-bold text-lapis underline underline-offset-4"
          >
            All courses
          </Link>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-lg text-muted">
            {course.description}
          </p>
          <p className="mt-5 text-sm font-bold">
            Taught by {course.teacher.name}
          </p>
          <p className="mt-1 text-sm text-muted">
            {plural(totalLessons, "lesson", "lessons")},{" "}
            {plural(takeableQuizzes.length, "quiz", "quizzes")}
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="lg:col-start-2 lg:row-start-1">
          <div className="space-y-6 lg:sticky lg:top-24">
            {isStaff && (
              <div className="border border-rule bg-white p-5">
                <h2 className="font-display text-lg font-semibold">
                  {course.published ? "Teacher view" : "Draft course"}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {course.published
                    ? "Students see this page with the lessons locked until they enroll."
                    : "Students cannot see this course yet. Publish it from the edit page when it is ready."}
                </p>
                <Link
                  href={`/courses/${course.id}/edit`}
                  className="btn btn-primary mt-4 w-full"
                >
                  Edit course
                </Link>
              </div>
            )}

            {!isStaff && isEnrolled && (
              <div className="border border-rule bg-white p-5">
                <h2 className="font-display text-lg font-semibold">
                  Your progress
                </h2>
                <div className="mt-3">
                  <ProgressBar
                    value={completedCount}
                    max={totalLessons}
                    label={`Progress in ${course.title}`}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {totalLessons === 0
                    ? "There are no lessons yet."
                    : completedCount === totalLessons
                      ? "You finished every lesson."
                      : `${completedCount} of ${totalLessons} lessons complete`}
                </p>
              </div>
            )}

            {!isStaff && isEnrolled && takeableQuizzes.length > 0 && (
              <div className="border border-rule bg-white p-5">
                <h2 className="font-display text-lg font-semibold">Quizzes</h2>
                <ul className="mt-3 space-y-2">
                  {takeableQuizzes.map((quiz) => {
                    const best = bestByQuiz.get(quiz.id);

                    return (
                      <li key={quiz.id}>
                        <Link
                          href={`/courses/${course.id}/quizzes/${quiz.id}`}
                          className="block border border-rule px-4 py-3 hover:border-ink"
                        >
                          <span className="block font-bold">{quiz.title}</span>
                          <span className="block text-sm text-muted">
                            {plural(
                              quiz._count.questions,
                              "question",
                              "questions",
                            )}
                          </span>
                          <span className="block text-sm text-muted">
                            {best
                              ? `Best score: ${best.score} of ${best.total}`
                              : "Not taken yet"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!isStaff && !isEnrolled && role === "STUDENT" && (
              <div className="border border-rule bg-white p-5">
                <h2 className="font-display text-lg font-semibold">
                  Join this course
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Enroll to open the lessons, track your progress and take the
                  quizzes.
                </p>
                <form action={enrollInCourse.bind(null, course.id)}>
                  <button type="submit" className="btn btn-accent mt-4 w-full">
                    Enroll in this course
                  </button>
                </form>
              </div>
            )}

            {!session && (
              <div className="border border-rule bg-white p-5">
                <h2 className="font-display text-lg font-semibold">
                  Log in to enroll
                </h2>
                <p className="mt-2 text-sm text-muted">
                  You need a student account to open the lessons.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link href="/login" className="btn btn-primary w-full">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn btn-ghost w-full">
                    Create an account
                  </Link>
                </div>
              </div>
            )}

            {session && !isStaff && !isEnrolled && role !== "STUDENT" && (
              <div className="border border-rule bg-white p-5">
                <p className="text-sm text-muted">
                  Only student accounts can enroll in courses.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="lg:col-start-1 lg:row-start-1">
          {!course.published && (
            <p className="mb-6 border-l-4 border-saffron bg-saffron/15 px-4 py-3 text-sm">
              This course is a draft. Students cannot see it yet.
            </p>
          )}

          <h2 className="mb-4 font-display text-2xl font-semibold">Lessons</h2>

          {course.lessons.length === 0 ? (
            <p className="border border-dashed border-rule bg-white p-8 text-center text-muted">
              No lessons have been added yet.
            </p>
          ) : (
            <ol className="divide-y divide-rule border-y border-rule bg-white">
              {course.lessons.map((lesson, index) => {
                const isDone = completedLessonIds.has(lesson.id);
                const isWatched = watchedLessonIds.has(lesson.id);
                const mustWatch =
                  isEnrolled &&
                  !isStaff &&
                  !!lesson.videoUrl &&
                  !isWatched &&
                  !isDone;

                return (
                  <li
                    key={lesson.id}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 px-5 py-6"
                  >
                    <div
                      aria-hidden="true"
                      className="font-display text-3xl leading-none text-muted"
                    >
                      {isDone ? <CheckIcon /> : index + 1}
                    </div>

                    <div>
                      <h3 className="font-display text-xl font-semibold leading-snug">
                        {lesson.title}
                        {isDone && (
                          <span className="ml-3 bg-fern/15 px-2 py-0.5 align-middle font-sans text-xs font-bold text-fern">
                            Completed
                          </span>
                        )}
                      </h3>

                      {canViewContent ? (
                        <>
                          {lesson.textContent && (
                            <p className="mt-3 max-w-[65ch] whitespace-pre-line text-[1.05rem] leading-relaxed">
                              {lesson.textContent}
                            </p>
                          )}

                          {lesson.videoUrl && (
                            <LessonPlayer
                              courseId={course.id}
                              lessonId={lesson.id}
                              url={lesson.videoUrl}
                              title={lesson.title}
                              tracking={mustWatch}
                            />
                          )}

                          {!lesson.textContent && !lesson.videoUrl && (
                            <p className="mt-3 text-sm text-muted">
                              No content has been added to this lesson yet.
                            </p>
                          )}

                          {isEnrolled && !mustWatch && (
                            <form
                              action={toggleLessonComplete.bind(
                                null,
                                course.id,
                                lesson.id,
                              )}
                              className="mt-5"
                            >
                              <button
                                type="submit"
                                className={
                                  isDone
                                    ? "btn btn-ghost btn-sm"
                                    : "btn btn-primary btn-sm"
                                }
                              >
                                {isDone
                                  ? "Undo completion"
                                  : "Mark as complete"}
                                <span className="sr-only">
                                  {" "}
                                  for {lesson.title}
                                </span>
                              </button>
                            </form>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-muted">
                          Enroll in this course to open this lesson.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { publishCourse } from "../../actions";
import { createQuiz } from "../../quiz-actions";
import {
  createLesson,
  deleteCourse,
  deleteLesson,
  moveLesson,
  unpublishCourse,
  updateCourse,
} from "../../manage-actions";
import LessonForm from "@/components/LessonForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      quizzes: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) {
    notFound();
  }

  const isOwner = session.user.id === course.teacherId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/courses");
  }

  const lessonCount = course.lessons.length;
  const hasLessons = lessonCount > 0;
  const enrolledCount = course._count.enrollments;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link
        href={`/courses/${course.id}`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Open the course page
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-3xl font-display text-3xl font-semibold leading-tight">
          {course.title}
        </h1>
        <span
          className={`px-2 py-1 text-xs font-bold ${
            course.published ? "bg-fern/15 text-fern" : "bg-saffron/25 text-ink"
          }`}
        >
          {course.published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="space-y-6 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="border border-rule bg-white p-5">
            <h2 className="font-display text-lg font-semibold">Publishing</h2>

            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex gap-2">
                <span
                  className={`font-bold ${hasLessons ? "text-fern" : "text-madder"}`}
                >
                  {hasLessons ? "Done" : "To do"}
                </span>
                Add at least one lesson
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-muted">Optional</span>
                Add a quiz
              </li>
            </ul>

            {course.published ? (
              <>
                <p className="mt-3 text-sm text-muted">
                  Students can see this course.{" "}
                  {enrolledCount === 1
                    ? "1 student is enrolled."
                    : `${enrolledCount} students are enrolled.`}
                </p>
                <form
                  action={unpublishCourse.bind(null, course.id)}
                  className="mt-4"
                >
                  <SubmitButton
                    className="btn btn-ghost w-full"
                    pendingText="Unpublishing..."
                    confirmMessage="Hide this course from students? Enrolled students will not be able to open it until you publish it again. Their progress is kept."
                  >
                    Unpublish
                  </SubmitButton>
                </form>
              </>
            ) : (
              <form
                action={publishCourse.bind(null, course.id)}
                className="mt-4"
              >
                <SubmitButton
                  className="btn btn-accent w-full"
                  pendingText="Publishing..."
                  disabled={!hasLessons}
                >
                  Publish course
                </SubmitButton>
                {!hasLessons && (
                  <p className="mt-2 text-sm text-muted">
                    Add a lesson to publish.
                  </p>
                )}
              </form>
            )}
          </div>

          <details className="border border-rule bg-white">
            <summary className="cursor-pointer px-5 py-4 font-display text-lg font-semibold">
              Course details
            </summary>
            <form
              action={updateCourse.bind(null, course.id)}
              className="space-y-4 border-t border-rule p-5"
            >
              <div>
                <label
                  htmlFor="course-title"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Title
                </label>
                <input
                  id="course-title"
                  name="title"
                  defaultValue={course.title}
                  required
                  maxLength={120}
                  className="field"
                />
              </div>
              <div>
                <label
                  htmlFor="course-description"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Description
                </label>
                <textarea
                  id="course-description"
                  name="description"
                  defaultValue={course.description}
                  required
                  rows={5}
                  maxLength={2000}
                  className="field"
                />
              </div>
              <SubmitButton className="btn btn-primary btn-sm">
                Save details
              </SubmitButton>
            </form>
          </details>

          <div className="border border-madder/40 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-madder">
              Delete course
            </h2>
            {enrolledCount > 0 ? (
              <p className="mt-2 text-sm text-muted">
                This course has enrolled students, so it cannot be deleted.
                Unpublish it instead.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  This removes the course, its lessons and its quizzes. It
                  cannot be undone.
                </p>
                <form action={deleteCourse.bind(null, course.id)}>
                  <SubmitButton
                    className="btn btn-danger btn-sm mt-4"
                    pendingText="Deleting..."
                    confirmMessage="Delete this course with all its lessons and quizzes? This cannot be undone."
                  >
                    Delete course
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </aside>

        <div className="space-y-12 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="lessons-heading">
            <h2
              id="lessons-heading"
              className="font-display text-2xl font-semibold"
            >
              Lessons ({lessonCount})
            </h2>

            {!hasLessons ? (
              <p className="mt-4 border border-dashed border-rule bg-white p-8 text-center text-muted">
                No lessons yet. Add the first one below.
              </p>
            ) : (
              <ol className="mt-4 divide-y divide-rule border-y border-rule bg-white">
                {course.lessons.map((lesson, index) => {
                  const kinds = [
                    lesson.textContent ? "Text" : null,
                    lesson.videoUrl ? "Video" : null,
                  ]
                    .filter(Boolean)
                    .join(" and ");

                  return (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4"
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 font-display text-xl text-muted"
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{lesson.title}</p>
                        <p className="text-sm text-muted">{kinds || "Empty"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <form
                          action={moveLesson.bind(
                            null,
                            course.id,
                            lesson.id,
                            "up",
                          )}
                        >
                          <SubmitButton
                            className="btn btn-ghost btn-sm"
                            pendingText="Moving..."
                            disabled={index === 0}
                          >
                            Move up
                            <span className="sr-only"> {lesson.title}</span>
                          </SubmitButton>
                        </form>
                        <form
                          action={moveLesson.bind(
                            null,
                            course.id,
                            lesson.id,
                            "down",
                          )}
                        >
                          <SubmitButton
                            className="btn btn-ghost btn-sm"
                            pendingText="Moving..."
                            disabled={index === lessonCount - 1}
                          >
                            Move down
                            <span className="sr-only"> {lesson.title}</span>
                          </SubmitButton>
                        </form>
                        <Link
                          href={`/courses/${course.id}/lessons/${lesson.id}/edit`}
                          className="btn btn-ghost btn-sm"
                        >
                          Edit
                          <span className="sr-only"> {lesson.title}</span>
                        </Link>
                        <form
                          action={deleteLesson.bind(null, course.id, lesson.id)}
                        >
                          <SubmitButton
                            className="btn btn-ghost btn-sm text-madder"
                            pendingText="Deleting..."
                            confirmMessage={`Delete the lesson "${lesson.title}"? Students' progress on it will be removed too.`}
                          >
                            Delete
                            <span className="sr-only"> {lesson.title}</span>
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="add-lesson-heading">
            <h2
              id="add-lesson-heading"
              className="font-display text-2xl font-semibold"
            >
              Add a lesson
            </h2>
            <div className="mt-4 border border-rule bg-white p-5">
              <LessonForm
                action={createLesson.bind(null, course.id)}
                submitLabel="Add lesson"
                resetOnSuccess
              />
            </div>
          </section>

          <section aria-labelledby="quizzes-heading">
            <h2
              id="quizzes-heading"
              className="font-display text-2xl font-semibold"
            >
              Quizzes ({course.quizzes.length})
            </h2>

            {course.quizzes.length === 0 ? (
              <p className="mt-4 text-muted">
                No quizzes yet. Quizzes are optional.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
                {course.quizzes.map((quiz) => (
                  <li
                    key={quiz.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
                  >
                    <div>
                      <p className="font-bold">{quiz.title}</p>
                      <p className="text-sm text-muted">
                        {quiz._count.questions === 0
                          ? "No questions yet. Add questions so students can take it."
                          : `${quiz._count.questions} ${
                              quiz._count.questions === 1
                                ? "question"
                                : "questions"
                            }`}
                      </p>
                    </div>
                    <Link
                      href={`/courses/${course.id}/quizzes/${quiz.id}/edit`}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit questions
                      <span className="sr-only"> for {quiz.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={createQuiz.bind(null, course.id)}
              className="mt-4 flex flex-wrap gap-2"
            >
              <label htmlFor="quiz-title" className="sr-only">
                Quiz title
              </label>
              <input
                id="quiz-title"
                name="title"
                required
                maxLength={120}
                placeholder="New quiz title"
                className="field min-w-0 flex-1"
              />
              <SubmitButton pendingText="Creating...">Create quiz</SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

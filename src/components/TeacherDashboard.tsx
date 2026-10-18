import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboard({
  teacherId,
  isAdmin,
}: {
  teacherId: string;
  isAdmin: boolean;
}) {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lessons: true, enrollments: true, quizzes: true } },
    },
  });

  const needsReview = await prisma.quiz.findMany({
    where: { course: { teacherId }, attempts: { some: { status: "PENDING" } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { title: true } },
      _count: { select: { attempts: { where: { status: "PENDING" } } } },
    },
  });

  return (
    <div className="space-y-10">
      {needsReview.length > 0 && (
        <section aria-labelledby="needs-review">
          <h2 id="needs-review" className="font-display text-2xl font-semibold">
            Needs your review
          </h2>
          <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
            {needsReview.map((quiz) => (
              <li
                key={quiz.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-bold">{quiz.title}</p>
                  <p className="text-sm text-muted">
                    {quiz.course.title}, {quiz._count.attempts}{" "}
                    {quiz._count.attempts === 1 ? "attempt is" : "attempts are"}{" "}
                    waiting for a mark
                  </p>
                </div>
                <Link
                  href={`/courses/${quiz.courseId}/quizzes/${quiz.id}/grading`}
                  className="btn btn-primary btn-sm"
                >
                  Mark written answers
                  <span className="sr-only"> for {quiz.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-white p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Administrator tools
            </h2>
            <p className="text-sm text-muted">
              Manage accounts, roles and every course on the platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="btn btn-primary btn-sm">
              Manage users
            </Link>
            <Link href="/admin/courses" className="btn btn-ghost btn-sm">
              All courses
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="teacher-courses">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id="teacher-courses"
            className="font-display text-2xl font-semibold"
          >
            Your courses
          </h2>
          <Link href="/courses/new" className="btn btn-primary btn-sm">
            Create a course
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="mt-4 border border-dashed border-rule bg-white p-8 text-center">
            <p className="font-display text-xl font-semibold">
              You have not created a course yet
            </p>
            <p className="mt-2 text-muted">
              Start with a title and a short description, then add lessons.
            </p>
            <Link href="/courses/new" className="btn btn-primary mt-5">
              Create your first course
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
            {courses.map((course) => (
              <li
                key={course.id}
                className="grid gap-x-6 gap-y-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-xl font-semibold">
                      {course.title}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold ${
                        course.published
                          ? "bg-fern/15 text-fern"
                          : "bg-saffron/25 text-ink"
                      }`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {course._count.lessons}{" "}
                    {course._count.lessons === 1 ? "lesson" : "lessons"},{" "}
                    {course._count.quizzes}{" "}
                    {course._count.quizzes === 1 ? "quiz" : "quizzes"},{" "}
                    {course._count.enrollments}{" "}
                    {course._count.enrollments === 1 ? "student" : "students"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/courses/${course.id}/students`}
                    className="btn btn-ghost btn-sm"
                  >
                    Students
                    <span className="sr-only"> in {course.title}</span>
                  </Link>
                  <Link
                    href={`/courses/${course.id}/edit`}
                    className="btn btn-primary btn-sm"
                  >
                    Edit
                    <span className="sr-only"> {course.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

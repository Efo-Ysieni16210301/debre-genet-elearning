import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import CourseCard from "@/components/CourseCard";
import ProgressBar from "@/components/ProgressBar";

export default async function StudentDashboard({
  studentId,
}: {
  studentId: string;
}) {
  const [enrollments, progress, attempts, suggestions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId, course: { published: true } },
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacher: { select: { name: true } },
            _count: { select: { lessons: true } },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { studentId, lesson: { course: { published: true } } },
      select: { lesson: { select: { courseId: true } } },
    }),
    prisma.quizAttempt.findMany({
      where: { studentId, quiz: { course: { published: true } } },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { published: true, enrollments: { none: { studentId } } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        teacher: { select: { name: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
    }),
  ]);

  const doneByCourse = new Map<string, number>();

  for (const row of progress) {
    const courseId = row.lesson.courseId;
    doneByCourse.set(courseId, (doneByCourse.get(courseId) ?? 0) + 1);
  }

  return (
    <div className="space-y-12">
      <section aria-labelledby="my-courses">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="my-courses" className="font-display text-2xl font-semibold">
            My courses
          </h2>
          <Link
            href="/courses"
            className="text-sm font-bold text-lapis underline underline-offset-4"
          >
            Browse all courses
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <div className="mt-4 border border-dashed border-rule bg-white p-8 text-center">
            <p className="font-display text-xl font-semibold">
              You have not enrolled in a course yet
            </p>
            <p className="mt-2 text-muted">Pick a course to see its lessons.</p>
            <Link href="/courses" className="btn btn-primary mt-5">
              Browse courses
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
            {enrollments.map(({ course }) => {
              const total = course._count.lessons;
              const done = Math.min(doneByCourse.get(course.id) ?? 0, total);
              const complete = total > 0 && done === total;
              const action =
                done === 0 ? "Start" : complete ? "Review" : "Resume";

              return (
                <li
                  key={course.id}
                  className="grid gap-x-6 gap-y-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/courses/${course.id}`}
                      className="font-display text-xl font-semibold underline-offset-4 hover:underline"
                    >
                      {course.title}
                    </Link>
                    <p className="text-sm text-muted">
                      Taught by {course.teacher.name}
                    </p>
                    <div className="mt-3 max-w-md">
                      <ProgressBar
                        value={done}
                        max={total}
                        label={`Progress in ${course.title}`}
                      />
                    </div>
                    <p className="mt-1.5 text-sm text-muted">
                      {total === 0
                        ? "No lessons yet"
                        : `${done} of ${total} lessons complete`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {complete && (
                      <Link
                        href={`/courses/${course.id}/certificate`}
                        className="btn btn-accent btn-sm"
                      >
                        Certificate
                        <span className="sr-only"> for {course.title}</span>
                      </Link>
                    )}
                    <Link
                      href={`/courses/${course.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      {action}
                      <span className="sr-only"> {course.title}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {attempts.length > 0 && (
        <section aria-labelledby="recent-quizzes">
          <h2
            id="recent-quizzes"
            className="font-display text-2xl font-semibold"
          >
            Recent quiz results
          </h2>
          <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/courses/${attempt.quiz.courseId}/quizzes/${attempt.quiz.id}`}
                    className="font-bold underline-offset-4 hover:underline"
                  >
                    {attempt.quiz.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {attempt.quiz.course.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {attempt.score} of {attempt.total}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDate(attempt.completedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions">
          <h2 id="suggestions" className="font-display text-2xl font-semibold">
            Courses you might like
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((course) => (
              <li key={course.id} className="flex">
                <CourseCard
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  teacherName={course.teacher.name}
                  lessonCount={course._count.lessons}
                  studentCount={course._count.enrollments}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

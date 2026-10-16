import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import ProgressBar from "@/components/ProgressBar";

export const metadata: Metadata = { title: "Students" };

type Stats = {
  lessonsDone: number;
  best: Map<string, number>;
  lastActive: Date | null;
};

export default async function StudentsPage({
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
    select: {
      id: true,
      title: true,
      teacherId: true,
      _count: { select: { lessons: true, quizzes: true } },
    },
  });

  if (!course) {
    notFound();
  }

  const isOwner = session.user.id === course.teacherId;

  if (!isOwner && session.user.role !== "ADMIN") {
    redirect("/courses");
  }

  const [enrollments, progress, attempts, watches] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: id },
      orderBy: { student: { name: "asc" } },
      include: { student: { select: { name: true, email: true } } },
    }),
    prisma.lessonProgress.findMany({
      where: { lesson: { courseId: id } },
      select: { studentId: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { quiz: { courseId: id } },
      select: {
        studentId: true,
        quizId: true,
        score: true,
        total: true,
        completedAt: true,
      },
    }),
    prisma.videoWatch.findMany({
      where: { lesson: { courseId: id } },
      select: { studentId: true, lastReportAt: true },
    }),
  ]);

  const stats = new Map<string, Stats>();

  function statsFor(studentId: string): Stats {
    let entry = stats.get(studentId);

    if (!entry) {
      entry = { lessonsDone: 0, best: new Map(), lastActive: null };
      stats.set(studentId, entry);
    }

    return entry;
  }

  function touch(entry: Stats, date: Date | null) {
    if (date && (!entry.lastActive || date > entry.lastActive)) {
      entry.lastActive = date;
    }
  }

  for (const row of progress) {
    const entry = statsFor(row.studentId);
    entry.lessonsDone++;
    touch(entry, row.completedAt);
  }

  for (const attempt of attempts) {
    const entry = statsFor(attempt.studentId);

    if (attempt.total > 0) {
      const ratio = attempt.score / attempt.total;
      const previous = entry.best.get(attempt.quizId);

      if (previous === undefined || ratio > previous) {
        entry.best.set(attempt.quizId, ratio);
      }
    }

    touch(entry, attempt.completedAt);
  }

  for (const watch of watches) {
    touch(statsFor(watch.studentId), watch.lastReportAt);
  }

  const totalLessons = course._count.lessons;
  const totalQuizzes = course._count.quizzes;
  const finishedCount = enrollments.filter(
    (enrollment) =>
      totalLessons > 0 &&
      (stats.get(enrollment.studentId)?.lessonsDone ?? 0) >= totalLessons,
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link
        href={`/courses/${course.id}/edit`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Back to {course.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
        Students
      </h1>
      <p className="mt-2 text-muted">
        {enrollments.length}{" "}
        {enrollments.length === 1 ? "student is" : "students are"} enrolled
        {totalLessons > 0 && enrollments.length > 0
          ? `, and ${finishedCount} ${
              finishedCount === 1 ? "has" : "have"
            } finished every lesson.`
          : "."}
      </p>

      {enrollments.length === 0 ? (
        <p className="mt-8 border border-dashed border-rule bg-white p-8 text-center text-muted">
          No students have enrolled yet.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-160 text-left text-sm">
            <caption className="sr-only">
              Progress of each student enrolled in {course.title}
            </caption>
            <thead className="border-b border-rule bg-paper">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">
                  Student
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Lessons
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Quizzes
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Last active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {enrollments.map((enrollment) => {
                const entry = stats.get(enrollment.studentId);
                const done = Math.min(entry?.lessonsDone ?? 0, totalLessons);
                const taken = entry?.best.size ?? 0;
                const average =
                  entry && taken > 0
                    ? Math.round(
                        ([...entry.best.values()].reduce(
                          (sum, value) => sum + value,
                          0,
                        ) /
                          taken) *
                          100,
                      )
                    : null;

                return (
                  <tr key={enrollment.id}>
                    <th scope="row" className="px-4 py-4 align-top font-normal">
                      <p className="font-bold">{enrollment.student.name}</p>
                      <p className="text-muted">{enrollment.student.email}</p>
                      <p className="text-muted">
                        Enrolled {formatDate(enrollment.enrolledAt)}
                      </p>
                    </th>
                    <td className="px-4 py-4 align-top">
                      <div className="w-40">
                        <ProgressBar
                          value={done}
                          max={totalLessons}
                          label={`Lessons completed by ${enrollment.student.name}`}
                        />
                      </div>
                      <p className="mt-1.5 text-muted">
                        {totalLessons === 0
                          ? "No lessons yet"
                          : `${done} of ${totalLessons}`}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {totalQuizzes === 0 ? (
                        <span className="text-muted">No quizzes</span>
                      ) : (
                        <>
                          <p>
                            {taken} of {totalQuizzes} taken
                          </p>
                          {average !== null && (
                            <p className="text-muted">
                              Average best score {average}%
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {entry?.lastActive ? (
                        formatDate(entry.lastActive)
                      ) : (
                        <span className="text-muted">Not started yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

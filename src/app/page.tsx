import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getI18n } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";

async function getContinueLearning(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, course: { published: true } },
    orderBy: { enrolledAt: "desc" },
    take: 3,
    include: {
      course: {
        select: {
          id: true,
          title: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  return Promise.all(
    enrollments.map(async (enrollment) => {
      const done = await prisma.lessonProgress.count({
        where: { studentId, lesson: { courseId: enrollment.course.id } },
      });

      return {
        id: enrollment.course.id,
        title: enrollment.course.title,
        total: enrollment.course._count.lessons,
        done,
      };
    }),
  );
}

export default async function Home() {
  const [session, { t }] = await Promise.all([auth(), getI18n()]);
  const role = session?.user.role;
  const userId = session?.user.id;
  const canTeach = role === "TEACHER" || role === "ADMIN";

  const latest = await prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      teacher: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  const continueLearning =
    role === "STUDENT" && userId ? await getContinueLearning(userId) : [];

  const myCourses =
    canTeach && userId
      ? await prisma.course.findMany({
          where: { teacherId: userId },
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            _count: { select: { lessons: true, enrollments: true } },
          },
        })
      : [];

  return (
    <>
      <section className="bg-lapis text-white">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
          <p lang="am" className="font-geez text-5xl leading-tight md:text-7xl">
            ደብረ ገነት
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-5xl">
            {t("common.schoolTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            {t("home.text")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className="btn btn-accent">
              {t("home.browse")}
            </Link>
            {!session && (
              <Link href="/signup" className="btn btn-outline-light">
                {t("home.createAccount")}
              </Link>
            )}
            {canTeach && (
              <Link href="/courses/new" className="btn btn-outline-light">
                {t("home.createCourse")}
              </Link>
            )}
          </div>
        </div>
        <div className="tilet" aria-hidden />
      </section>

      {continueLearning.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t("home.continueTitle")}
          </h2>
          <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
            {continueLearning.map((item) => {
              const percent =
                item.total === 0
                  ? 0
                  : Math.round((item.done / item.total) * 100);
              const action =
                item.done === 0
                  ? t("home.start")
                  : percent === 100
                    ? t("home.review")
                    : t("home.resume");

              return (
                <li key={item.id}>
                  <Link
                    href={`/courses/${item.id}`}
                    className="flex items-center gap-5 px-4 py-4 hover:bg-paper"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{item.title}</p>
                      <div
                        role="progressbar"
                        aria-label={t("home.progressIn", { title: item.title })}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-2 h-1.5 w-full max-w-sm bg-rule"
                      >
                        <div
                          className="h-full bg-fern"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="hidden text-sm text-muted sm:block">
                      {t("home.lessonsDone", {
                        done: item.done,
                        total: item.total,
                      })}
                    </span>
                    <span className="btn btn-primary btn-sm">{action}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {canTeach && (
        <section className="mx-auto max-w-6xl px-5 pt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">
              {t("home.yourCourses")}
            </h2>
            <Link href="/courses/new" className="btn btn-primary btn-sm">
              {t("home.createCourse")}
            </Link>
          </div>

          {myCourses.length === 0 ? (
            <p className="mt-4 border border-dashed border-rule bg-white p-6 text-muted">
              {t("home.noCourses")}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-rule border-y border-rule bg-white">
              {myCourses.map((course) => (
                <li
                  key={course.id}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{course.title}</p>
                    <p className="text-sm text-muted">
                      {t("courses.lessonCount", {
                        count: course._count.lessons,
                      })}
                      ,{" "}
                      {t("courses.studentCount", {
                        count: course._count.enrollments,
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold ${
                      course.published
                        ? "bg-fern/15 text-fern"
                        : "bg-saffron/25 text-ink"
                    }`}
                  >
                    {course.published ? t("home.published") : t("home.draft")}
                  </span>
                  <Link
                    href={`/courses/${course.id}/edit`}
                    className="btn btn-ghost btn-sm"
                  >
                    {t("home.edit")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">
            {t("home.latest")}
          </h2>
          <Link
            href="/courses"
            className="text-sm font-bold text-lapis underline underline-offset-4"
          >
            {t("home.seeAll")}
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="mt-6 border border-dashed border-rule bg-white p-8 text-center text-muted">
            {t("home.noneYet")}
          </p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((course) => (
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
        )}
      </section>
    </>
  );
}

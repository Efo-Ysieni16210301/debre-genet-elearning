import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getI18n } from "@/i18n/server";
import CourseCard from "@/components/CourseCard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("courses.title") };
}

export default async function CoursesPage() {
  const [session, { t }] = await Promise.all([auth(), getI18n()]);
  const canCreate =
    session?.user.role === "TEACHER" || session?.user.role === "ADMIN";

  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {t("courses.title")}
          </h1>
          <p className="mt-2 max-w-prose text-muted">{t("courses.intro")}</p>
        </div>
        {canCreate && (
          <Link href="/courses/new" className="btn btn-primary">
            {t("courses.create")}
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule bg-white p-10 text-center">
          <p className="font-display text-xl font-semibold">
            {t("courses.emptyTitle")}
          </p>
          <p className="mt-2 text-muted">
            {canCreate ? t("courses.emptyTeacher") : t("courses.emptyStudent")}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
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
    </div>
  );
}

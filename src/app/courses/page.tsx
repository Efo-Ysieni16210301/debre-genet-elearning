import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import CourseCard from "@/components/CourseCard";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const session = await auth();
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
          <h1 className="font-display text-3xl font-semibold">Courses</h1>
          <p className="mt-2 max-w-prose text-muted">
            Pick a course to see its lessons. Enroll to unlock the videos, notes
            and quizzes.
          </p>
        </div>
        {canCreate && (
          <Link href="/courses/new" className="btn btn-primary">
            Create a course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule bg-white p-10 text-center">
          <p className="font-display text-xl font-semibold">
            No courses are published yet
          </p>
          <p className="mt-2 text-muted">
            {canCreate
              ? "Create a course and publish it to see it here."
              : "Your teachers are preparing the first courses. Check back soon."}
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

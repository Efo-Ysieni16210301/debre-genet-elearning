import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import AdminNav from "@/components/AdminNav";

export const metadata: Metadata = { title: "Admin: courses" };

export default async function AdminCoursesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true, quizzes: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Administration</h1>

      <AdminNav current="courses" />

      <p className="mt-6 text-sm text-muted">
        {courses.length} {courses.length === 1 ? "course" : "courses"} on the
        platform.
      </p>

      {courses.length === 0 ? (
        <p className="mt-4 border border-dashed border-rule bg-white p-8 text-center text-muted">
          No courses have been created yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-3xl text-left text-sm">
            <caption className="sr-only">All courses</caption>
            <thead className="border-b border-rule bg-paper">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">
                  Course
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Content
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Students
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row" className="px-4 py-4 align-top font-normal">
                    <p className="font-bold">{course.title}</p>
                    <p className="text-muted">
                      {course.teacher.name}, created{" "}
                      {formatDate(course.createdAt)}
                    </p>
                  </th>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold ${
                        course.published
                          ? "bg-fern/15 text-fern"
                          : "bg-saffron/25 text-ink"
                      }`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-muted">
                    {course._count.lessons}{" "}
                    {course._count.lessons === 1 ? "lesson" : "lessons"},{" "}
                    {course._count.quizzes}{" "}
                    {course._count.quizzes === 1 ? "quiz" : "quizzes"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {course._count.enrollments}
                  </td>
                  <td className="px-4 py-4 align-top">
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
                        className="btn btn-ghost btn-sm"
                      >
                        Edit
                        <span className="sr-only"> {course.title}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

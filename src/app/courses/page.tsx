import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      teacher: {
        select: { name: true },
      },
      _count: {
        select: { lessons: true, enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const session = await auth();
  const canCreateCourse =
    session?.user.role === "TEACHER" || session?.user.role === "ADMIN";

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Available Courses</h1>
        {canCreateCourse && (
          <Link
            href="/courses/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Create Course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="text-gray-500">No courses available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block border rounded-lg p-4 hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {course.description}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                By {course.teacher.name} · {course._count.lessons} lessons ·{" "}
                {course._count.enrollments} students
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

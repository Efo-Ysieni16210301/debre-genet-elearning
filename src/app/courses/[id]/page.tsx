import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      teacher: {
        select: { name: true },
      },
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course || !course.published) {
    notFound();
  }

  let isEnrolled = false;

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
  }

  const isOwner = session?.user.id === course.teacherId;
  const canViewContent =
    isEnrolled || isOwner || session?.user.role === "ADMIN";

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-gray-600 mt-2">{course.description}</p>
      <p className="text-sm text-gray-500 mt-1">
        Taught by {course.teacher.name}
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Lessons</h2>

        {!canViewContent && (
          <p className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded mb-4">
            Enroll in this course to view lesson content.
          </p>
        )}

        <ul className="space-y-3">
          {course.lessons.map((lesson) => (
            <li key={lesson.id} className="border rounded p-4">
              <h3 className="font-medium">{lesson.title}</h3>
              {canViewContent ? (
                <>
                  {lesson.textContent && (
                    <p className="text-sm text-gray-700 mt-2">
                      {lesson.textContent}
                    </p>
                  )}
                  {lesson.videoUrl && (
                    <video
                      src={lesson.videoUrl}
                      controls
                      className="mt-3 w-full rounded"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-1">🔒 Locked</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { addLesson, publishCourse } from "../../actions";
import AddLessonForm from "@/components/AddLessonForm";

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
      lessons: { orderBy: { order: "asc" } },
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

  const addLessonWithId = addLesson.bind(null, course.id);
  const publishThisCourse = publishCourse.bind(null, course.id);

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-gray-500">
            Status: {course.published ? "✅ Published" : "📝 Draft"}
          </p>
        </div>

        {!course.published && (
          <form action={publishThisCourse}>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
            >
              Publish Course
            </button>
          </form>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Lessons ({course.lessons.length})
        </h2>
        <ul className="space-y-2">
          {course.lessons.map((lesson) => (
            <li key={lesson.id} className="border rounded p-3 text-sm">
              {lesson.order}. {lesson.title}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Add a Lesson</h2>
        <AddLessonForm addLessonAction={addLessonWithId} />
      </div>
    </div>
  );
}

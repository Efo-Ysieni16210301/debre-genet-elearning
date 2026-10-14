import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { enrollInCourse, toggleLessonComplete } from "../actions";
import { getYouTubeEmbedUrl } from "@/lib/video";

function LessonVideo({ url }: { url: string }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(url);

  if (youtubeEmbedUrl) {
    return (
      <iframe
        src={youtubeEmbedUrl}
        className="mt-3 w-full aspect-video rounded"
        allowFullScreen
      />
    );
  }

  return <video src={url} controls className="mt-3 w-full rounded" />;
}

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
      quizzes: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      },
    },
  });

  if (!course || !course.published) {
    notFound();
  }

  let isEnrolled = false;
  let completedLessonIds = new Set<string>();

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

    if (isEnrolled) {
      const progress = await prisma.lessonProgress.findMany({
        where: {
          studentId: session.user.id,
          lesson: { courseId: course.id },
        },
        select: { lessonId: true },
      });
      completedLessonIds = new Set(progress.map((p) => p.lessonId));
    }
  }

  const isOwner = session?.user.id === course.teacherId;
  const canViewContent =
    isEnrolled || isOwner || session?.user.role === "ADMIN";

  const takeableQuizzes = course.quizzes.filter(
    (quiz) => quiz._count.questions > 0,
  );

  const totalLessons = course.lessons.length;
  const completedCount = completedLessonIds.size;
  const percent =
    totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-gray-600 mt-2">{course.description}</p>
      <p className="text-sm text-gray-500 mt-1">
        Taught by {course.teacher.name}
      </p>

      {session?.user.role === "STUDENT" && !isEnrolled && (
        <form action={enrollInCourse.bind(null, course.id)} className="mt-4">
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700"
          >
            Enroll in this Course
          </button>
        </form>
      )}

      {isEnrolled && totalLessons > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Your progress</span>
            <span>
              {completedCount} of {totalLessons} lessons ({percent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Lessons</h2>

        {!canViewContent && (
          <p className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded mb-4">
            Enroll in this course to view lesson content.
          </p>
        )}

        <ul className="space-y-3">
          {course.lessons.map((lesson) => {
            const isDone = completedLessonIds.has(lesson.id);

            return (
              <li key={lesson.id} className="border rounded p-4">
                <h3 className="font-medium">
                  {isDone && <span className="text-green-600">✓ </span>}
                  {lesson.title}
                </h3>

                {canViewContent ? (
                  <>
                    {lesson.textContent && (
                      <p className="text-sm text-gray-700 mt-2">
                        {lesson.textContent}
                      </p>
                    )}
                    {lesson.videoUrl && <LessonVideo url={lesson.videoUrl} />}

                    {isEnrolled && (
                      <form
                        action={toggleLessonComplete.bind(
                          null,
                          course.id,
                          lesson.id,
                        )}
                        className="mt-3"
                      >
                        <button
                          type="submit"
                          className={
                            isDone
                              ? "text-sm text-gray-600 underline"
                              : "text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          }
                        >
                          {isDone
                            ? "Completed, click to undo"
                            : "Mark as complete"}
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">🔒 Locked</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {isEnrolled && takeableQuizzes.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Quizzes</h2>
          <ul className="space-y-2">
            {takeableQuizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="border rounded p-3 text-sm flex justify-between items-center"
              >
                <span>
                  {quiz.title} ({quiz._count.questions} questions)
                </span>
                <Link
                  href={`/courses/${course.id}/quizzes/${quiz.id}`}
                  className="text-blue-600 underline"
                >
                  Take quiz
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

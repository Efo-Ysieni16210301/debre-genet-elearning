import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { updateLesson } from "@/app/courses/manage-actions";
import LessonForm from "@/components/LessonForm";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { title: true, teacherId: true } } },
  });

  if (!lesson || lesson.courseId !== id) {
    notFound();
  }

  const isOwner = session.user.id === lesson.course.teacherId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/courses");
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href={`/courses/${id}/edit`}
        className="text-sm font-bold text-lapis underline underline-offset-4"
      >
        Back to {lesson.course.title}
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">Edit lesson</h1>

      <div className="mt-6 border border-rule bg-white p-5">
        <LessonForm
          action={updateLesson.bind(null, id, lessonId)}
          submitLabel="Save lesson"
          onSavedHref={`/courses/${id}/edit`}
          initial={{
            title: lesson.title,
            textContent: lesson.textContent ?? "",
            videoUrl: lesson.videoUrl ?? "",
          }}
        />
      </div>

      <p className="mt-4 text-sm text-muted">
        If you replace the video, students&apos; saved watching positions for
        this lesson are cleared. Students who already completed the lesson stay
        completed.
      </p>
    </div>
  );
}

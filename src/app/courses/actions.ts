"use server";
import {
  END_MARGIN,
  MAX_CREDIT_GAP,
  MAX_DURATION,
  MAX_RATE,
  MIN_REPORT_GAP,
  SLACK,
} from "@/lib/watch-rules";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCourse(formData: FormData) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    throw new Error("Not authorized to create courses.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  if (title.length > 120) {
    throw new Error("The title is too long (120 characters at most).");
  }

  if (description.length > 2000) {
    throw new Error("The description is too long (2000 characters at most).");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      teacherId: session.user.id,
    },
  });

  redirect(`/courses/${course.id}/edit`);
}



export async function publishCourse(courseId: string) {
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error("Course not found.");
  }

  const isOwner = session?.user.id === course.teacherId;
  const isAdmin = session?.user.role === "ADMIN";

  if (!session || (!isOwner && !isAdmin)) {
    throw new Error("Not authorized to publish this course.");
  }

  const lessonCount = await prisma.lesson.count({ where: { courseId } });

  if (lessonCount === 0) {
    throw new Error("Add at least one lesson before publishing.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { published: true },
  });

  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function enrollInCourse(courseId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in to enroll.");
  }

  if (session.user.role !== "STUDENT") {
    throw new Error("Only students can enroll in courses.");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course || !course.published) {
    throw new Error("This course is not available.");
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  if (existingEnrollment) {
    throw new Error("Already enrolled in this course.");
  }

  await prisma.enrollment.create({
    data: {
      studentId: session.user.id,
      courseId,
    },
  });

  revalidatePath(`/courses/${courseId}`);
}
export async function toggleLessonComplete(courseId: string, lessonId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in.");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  if (!enrollment) {
    throw new Error("You must be enrolled in this course.");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson || lesson.courseId !== courseId) {
    throw new Error("Lesson not found in this course.");
  }

  const existing = await prisma.lessonProgress.findUnique({
    where: {
      studentId_lessonId: {
        studentId: session.user.id,
        lessonId,
      },
    },
  });

  if (existing) {
    await prisma.lessonProgress.delete({
      where: { id: existing.id },
    });
  } else {
    if (lesson.videoUrl) {
      const watch = await prisma.videoWatch.findUnique({
        where: {
          studentId_lessonId: {
            studentId: session.user.id,
            lessonId,
          },
        },
      });

      if (!watch?.finishedAt) {
        throw new Error("Watch the whole video to complete this lesson.");
      }
    }

    await prisma.lessonProgress.create({
      data: {
        studentId: session.user.id,
        lessonId,
      },
    });
  }

  revalidatePath(`/courses/${courseId}`);
}
type WatchResult =
  | { ok: true; watchedSeconds: number }
  | { ok: false; message: string };

async function checkVideoAccess(courseId: string, lessonId: string) {
  const session = await auth();

  if (!session) {
    return { ok: false as const, message: "You must be logged in." };
  }

  const [enrollment, lesson] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId,
        },
      },
    }),
    prisma.lesson.findUnique({ where: { id: lessonId } }),
  ]);

  if (!enrollment) {
    return {
      ok: false as const,
      message: "You must be enrolled in this course.",
    };
  }

  if (!lesson || lesson.courseId !== courseId || !lesson.videoUrl) {
    return { ok: false as const, message: "This lesson has no video." };
  }

  return { ok: true as const, studentId: session.user.id };
}

function validTimes(position: number, duration: number) {
  return (
    Number.isFinite(position) &&
    Number.isFinite(duration) &&
    position >= 0 &&
    duration >= 1 &&
    duration <= MAX_DURATION
  );
}

function creditProgress(
  previous: { watchedSeconds: number; baseline: Date } | null,
  position: number,
  duration: number,
  now: Date,
) {
  const frontier = previous?.watchedSeconds ?? 0;
  const elapsed = previous
    ? (now.getTime() - previous.baseline.getTime()) / 1000
    : 0;
  const allowed =
    frontier +
    Math.min(Math.max(elapsed, 0), MAX_CREDIT_GAP) * MAX_RATE +
    SLACK;

  return Math.max(frontier, Math.min(position, allowed, duration));
}

export async function reportProgress(
  courseId: string,
  lessonId: string,
  position: number,
  duration: number,
): Promise<WatchResult> {
  const access = await checkVideoAccess(courseId, lessonId);

  if (!access.ok) {
    return access;
  }

  if (!validTimes(position, duration)) {
    return { ok: false, message: "Could not read the video position." };
  }

  const now = new Date();

  const watch = await prisma.videoWatch.findUnique({
    where: {
      studentId_lessonId: { studentId: access.studentId, lessonId },
    },
  });

  if (!watch) {
    const frontier = creditProgress(null, position, duration, now);

    await prisma.videoWatch.upsert({
      where: {
        studentId_lessonId: { studentId: access.studentId, lessonId },
      },
      create: {
        studentId: access.studentId,
        lessonId,
        watchedSeconds: frontier,
        durationSeconds: duration,
        lastReportAt: now,
      },
      update: {},
    });

    return { ok: true, watchedSeconds: frontier };
  }

  if (watch.finishedAt) {
    return { ok: true, watchedSeconds: watch.watchedSeconds };
  }

  const baseline = watch.lastReportAt ?? watch.startedAt;
  const sinceLast = (now.getTime() - baseline.getTime()) / 1000;

  if (sinceLast < MIN_REPORT_GAP) {
    return { ok: true, watchedSeconds: watch.watchedSeconds };
  }

  const knownDuration = watch.durationSeconds ?? duration;
  const frontier = creditProgress(
    { watchedSeconds: watch.watchedSeconds, baseline },
    position,
    knownDuration,
    now,
  );

  await prisma.videoWatch.update({
    where: { id: watch.id },
    data: {
      watchedSeconds: frontier,
      durationSeconds: knownDuration,
      lastReportAt: now,
    },
  });

  return { ok: true, watchedSeconds: frontier };
}

export async function finishWatching(
  courseId: string,
  lessonId: string,
  duration: number,
): Promise<WatchResult> {
  const access = await checkVideoAccess(courseId, lessonId);

  if (!access.ok) {
    return access;
  }

  if (!validTimes(0, duration)) {
    return {
      ok: false,
      message:
        "Could not read the video length. Reload the page and try again.",
    };
  }

  const watch = await prisma.videoWatch.findUnique({
    where: {
      studentId_lessonId: { studentId: access.studentId, lessonId },
    },
  });

  if (!watch) {
    return {
      ok: false,
      message: "Press play and watch the video to the end.",
    };
  }

  const now = new Date();
  const knownDuration = watch.durationSeconds ?? duration;
  const frontier = creditProgress(
    {
      watchedSeconds: watch.watchedSeconds,
      baseline: watch.lastReportAt ?? watch.startedAt,
    },
    knownDuration,
    knownDuration,
    now,
  );

  if (frontier < knownDuration - END_MARGIN) {
    return {
      ok: false,
      message:
        "Some of your viewing could not be saved, for example if your connection dropped. Reload the page, choose Resume, and watch to the end.",
    };
  }

  await prisma.$transaction([
    prisma.videoWatch.update({
      where: { id: watch.id },
      data: {
        watchedSeconds: frontier,
        durationSeconds: knownDuration,
        lastReportAt: now,
        finishedAt: now,
      },
    }),
    prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId: access.studentId, lessonId },
      },
      update: {},
      create: { studentId: access.studentId, lessonId },
    }),
  ]);

  revalidatePath(`/courses/${courseId}`);
  return { ok: true, watchedSeconds: frontier };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { newCertificateCode } from "@/lib/certificate-code";

export async function claimCertificate(courseId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in.");
  }

  const [course, student] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { lessons: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    }),
  ]);

  if (!course || !course.published || !student) {
    throw new Error("Course not found.");
  }

  const progress = await prisma.lessonProgress.findMany({
    where: { studentId: session.user.id, lesson: { courseId } },
    select: { completedAt: true },
  });

  if (course._count.lessons === 0 || progress.length < course._count.lessons) {
    throw new Error("Finish every lesson before requesting a certificate.");
  }

  const completedAt = progress.reduce(
    (latest, row) => (row.completedAt > latest ? row.completedAt : latest),
    progress[0].completedAt,
  );

  await prisma.certificate.upsert({
    where: {
      studentId_courseId: { studentId: session.user.id, courseId },
    },
    update: {},
    create: {
      code: newCertificateCode(),
      studentName: student.name,
      courseTitle: course.title,
      teacherName: course.teacher.name,
      completedAt,
      studentId: session.user.id,
      courseId,
    },
  });

  revalidatePath(`/courses/${courseId}/certificate`);
}

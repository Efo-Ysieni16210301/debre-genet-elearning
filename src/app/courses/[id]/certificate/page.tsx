import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate, formatEthiopianDate } from "@/lib/dates";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "Certificate" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const [course, student] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
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
    notFound();
  }

  const totalLessons = course._count.lessons;

  const progress = await prisma.lessonProgress.findMany({
    where: { studentId: session.user.id, lesson: { courseId: course.id } },
    select: { completedAt: true },
  });

  const complete = totalLessons > 0 && progress.length >= totalLessons;

  if (!complete) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">
          Your certificate is not ready yet
        </h1>
        <p className="mt-3 text-muted">
          Finish every lesson in {course.title} to receive your certificate.
          {totalLessons > 0 &&
            ` You have completed ${progress.length} of ${totalLessons}.`}
        </p>
        <Link href={`/courses/${course.id}`} className="btn btn-primary mt-6">
          Back to the course
        </Link>
      </div>
    );
  }

  const finishedAt = progress.reduce(
    (latest, row) => (row.completedAt > latest ? row.completedAt : latest),
    progress[0].completedAt,
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 print:max-w-none print:p-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/courses/${course.id}`}
          className="text-sm font-bold text-lapis underline underline-offset-4"
        >
          Back to the course
        </Link>
        <PrintButton />
      </div>

      <div className="border-8 border-double border-lapis bg-white px-8 py-12 text-center sm:px-16">
        <p lang="am" className="font-geez text-3xl text-lapis sm:text-4xl">
          ደብረ ገነት ሰንበት ትምህርት ቤት
        </p>
        <p className="mt-1 font-display text-lg">Debre Genet Sunday School</p>

        <div className="tilet mx-auto my-8 max-w-xs" aria-hidden="true" />

        <h1 className="font-display text-3xl font-semibold sm:text-5xl">
          Certificate of completion
        </h1>

        <p className="mt-8 text-muted">This certifies that</p>
        <p className="mt-2 font-display text-3xl font-semibold sm:text-5xl">
          {student.name}
        </p>

        <p className="mt-8 text-muted">
          has completed every lesson of the course
        </p>
        <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          {course.title}
        </p>

        <div className="mt-10">
          <p className="font-bold">{formatDate(finishedAt)}</p>
          <p lang="am" className="font-geez text-muted">
            {formatEthiopianDate(finishedAt)}
          </p>
        </div>

        <p className="mt-10 text-sm text-muted">
          Teacher:{" "}
          <span className="font-bold text-ink">{course.teacher.name}</span>
        </p>
      </div>
    </div>
  );
}

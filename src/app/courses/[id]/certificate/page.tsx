import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { siteOrigin } from "@/lib/site";
import { formatDate, formatEthiopianDate } from "@/lib/dates";
import { claimCertificate } from "../../certificate-actions";
import PrintButton from "@/components/PrintButton";
import SubmitButton from "@/components/SubmitButton";

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

  const certificate = await prisma.certificate.findUnique({
    where: {
      studentId_courseId: { studentId: session.user.id, courseId: id },
    },
  });

  if (!certificate) {
    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        title: true,
        published: true,
        _count: { select: { lessons: true } },
      },
    });

    if (!course || !course.published) {
      notFound();
    }

    const done = await prisma.lessonProgress.count({
      where: { studentId: session.user.id, lesson: { courseId: id } },
    });
    const total = course._count.lessons;

    if (total === 0 || done < total) {
      return (
        <div className="mx-auto max-w-xl px-5 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">
            Your certificate is not ready yet
          </h1>
          <p className="mt-3 text-muted">
            Finish every lesson in {course.title} to receive your certificate.
            {total > 0 && ` You have completed ${done} of ${total}.`}
          </p>
          <Link href={`/courses/${id}`} className="btn btn-primary mt-6">
            Back to the course
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">
          You finished {course.title}
        </h1>
        <p className="mt-3 text-muted">
          Your certificate will carry a verification code. Anyone can enter that
          code on this website to check that the certificate is genuine.
        </p>
        <form action={claimCertificate.bind(null, id)} className="mt-6">
          <SubmitButton
            className="btn btn-accent"
            pendingText="Issuing your certificate..."
          >
            Issue my certificate
          </SubmitButton>
        </form>
        <p className="mt-4 text-sm text-muted">
          Your name is taken from your account as it is written now. If it needs
          correcting, change it on your Account page first.
        </p>
      </div>
    );
  }

  if (certificate.revokedAt) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">
          This certificate was withdrawn
        </h1>
        <p className="mt-3 text-muted">
          An administrator withdrew certificate {certificate.code}. It no longer
          passes verification. Please speak to your teacher if you think this is
          a mistake.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          Back to my dashboard
        </Link>
      </div>
    );
  }

  const origin = await siteOrigin();
  const verifyUrl = `${origin}/verify/${certificate.code}`;
  const qrSvg = await QRCode.toString(verifyUrl, {
    type: "svg",
    margin: 1,
    width: 128,
    color: { dark: "#151a2e", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 print:max-w-none print:p-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/courses/${id}`}
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
          {certificate.studentName}
        </p>

        <p className="mt-8 text-muted">
          has completed every lesson of the course
        </p>
        <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          {certificate.courseTitle}
        </p>

        <div className="mt-10">
          <p className="font-bold">{formatDate(certificate.completedAt)}</p>
          <p lang="am" className="font-geez text-muted">
            {formatEthiopianDate(certificate.completedAt)}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 text-left">
          <div className="text-sm text-muted">
            <p>
              Teacher:{" "}
              <span className="font-bold text-ink">
                {certificate.teacherName}
              </span>
            </p>
            <p className="mt-3">Verification code</p>
            <p className="font-mono text-lg font-bold tracking-wide text-ink">
              {certificate.code}
            </p>
            <p className="mt-2 max-w-xs">
              To check that this certificate is genuine, scan the code or go to{" "}
              <span className="font-bold text-ink">{origin}/verify</span> and
              enter the verification code.
            </p>
          </div>

          <div
            role="img"
            aria-label="QR code that opens the verification page"
            className="h-28 w-28 shrink-0 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
      </div>
    </div>
  );
}

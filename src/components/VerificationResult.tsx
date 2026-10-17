import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/certificate-code";
import { formatDate, formatEthiopianDate } from "@/lib/dates";

export default async function VerificationResult({ code }: { code: string }) {
  const normalized = normalizeCode(code);

  if (!normalized) {
    return (
      <div role="status" className="border-l-4 border-madder bg-madder/10 p-5">
        <h2 className="font-display text-xl font-semibold">
          That is not a valid code
        </h2>
        <p className="mt-2 text-sm">
          Verification codes look like{" "}
          <span className="font-mono">DG-ABCD-EFGH-JKLM</span>. Check the code
          printed on the certificate and try again.
        </p>
      </div>
    );
  }

  const certificate = await prisma.certificate.findUnique({
    where: { code: normalized },
  });

  if (!certificate) {
    return (
      <div role="status" className="border-l-4 border-madder bg-madder/10 p-5">
        <h2 className="font-display text-xl font-semibold">
          No certificate found
        </h2>
        <p className="mt-2 text-sm">
          We have no certificate with the code{" "}
          <span className="font-mono">{normalized}</span>. If you copied it by
          hand, check for a mistyped character. A certificate that cannot be
          found here is not genuine.
        </p>
      </div>
    );
  }

  if (certificate.revokedAt) {
    return (
      <div role="status" className="border-l-4 border-madder bg-madder/10 p-5">
        <h2 className="font-display text-xl font-semibold">
          This certificate was withdrawn
        </h2>
        <p className="mt-2 text-sm">
          The code <span className="font-mono">{certificate.code}</span> exists,
          but the school withdrew this certificate on{" "}
          {formatDate(certificate.revokedAt)}. It is no longer valid.
        </p>
      </div>
    );
  }

  return (
    <div role="status" className="border border-rule bg-white">
      <div className="border-b-4 border-fern bg-fern/10 px-5 py-4">
        <h2 className="font-display text-xl font-semibold text-fern">
          Valid certificate
        </h2>
        <p className="mt-1 text-sm">
          Debre Genet Sunday School issued this certificate.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-5 text-sm">
        <dt className="text-muted">Awarded to</dt>
        <dd className="font-display text-lg font-semibold">
          {certificate.studentName}
        </dd>

        <dt className="text-muted">For completing</dt>
        <dd className="font-bold">{certificate.courseTitle}</dd>

        <dt className="text-muted">Teacher</dt>
        <dd>{certificate.teacherName}</dd>

        <dt className="text-muted">Completed on</dt>
        <dd>
          {formatDate(certificate.completedAt)}
          <span lang="am" className="ml-3 font-geez text-muted">
            {formatEthiopianDate(certificate.completedAt)}
          </span>
        </dd>

        <dt className="text-muted">Issued on</dt>
        <dd>{formatDate(certificate.issuedAt)}</dd>

        <dt className="text-muted">Code</dt>
        <dd className="font-mono font-bold">{certificate.code}</dd>
      </dl>

      <p className="border-t border-rule px-5 py-4 text-sm text-muted">
        Check that the name above matches the name on the certificate you are
        looking at.
      </p>
    </div>
  );
}

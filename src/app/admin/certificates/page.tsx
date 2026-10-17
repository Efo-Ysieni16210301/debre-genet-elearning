import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import { restoreCertificate, revokeCertificate } from "../certificate-actions";
import AdminNav from "@/components/AdminNav";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Admin: certificates" };

const PAGE_SIZE = 20;

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { q: rawQuery, page: rawPage } = await searchParams;
  const q = (rawQuery ?? "").trim().slice(0, 100);
  const requestedPage = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  const where: Prisma.CertificateWhereInput = q
    ? {
        OR: [
          { code: { contains: q.toUpperCase() } },
          { studentName: { contains: q, mode: "insensitive" } },
          { courseTitle: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const matching = await prisma.certificate.count({ where });
  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const certificates = await prisma.certificate.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(target));
    return `/admin/certificates?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Administration</h1>
      <AdminNav current="certificates" />

      <form method="get" role="search" className="mt-8 flex flex-wrap gap-2">
        <label htmlFor="certificate-search" className="sr-only">
          Search by code, student or course
        </label>
        <input
          id="certificate-search"
          name="q"
          defaultValue={q}
          placeholder="Search by code, student or course"
          className="field min-w-0 flex-1 sm:max-w-sm"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {q && (
          <Link href="/admin/certificates" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-muted">
        {matching} {matching === 1 ? "certificate" : "certificates"}
        {q ? ` match "${q}"` : " issued so far"}. A withdrawn certificate stops
        passing verification straight away.
      </p>

      {certificates.length === 0 ? (
        <p className="mt-6 border border-dashed border-rule bg-white p-8 text-center text-muted">
          No certificates found.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-3xl text-left text-sm">
            <caption className="sr-only">Issued certificates</caption>
            <thead className="border-b border-rule bg-paper">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">
                  Certificate
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Issued
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {certificates.map((certificate) => (
                <tr key={certificate.id}>
                  <th scope="row" className="px-4 py-4 align-top font-normal">
                    <p className="font-bold">{certificate.studentName}</p>
                    <p className="text-muted">{certificate.courseTitle}</p>
                    <p className="mt-1 font-mono text-xs">
                      <Link
                        href={`/verify/${certificate.code}`}
                        className="text-lapis underline underline-offset-4"
                      >
                        {certificate.code}
                      </Link>
                    </p>
                  </th>
                  <td className="px-4 py-4 align-top">
                    {formatDate(certificate.issuedAt)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold ${
                        certificate.revokedAt
                          ? "bg-madder/15 text-madder"
                          : "bg-fern/15 text-fern"
                      }`}
                    >
                      {certificate.revokedAt ? "Withdrawn" : "Valid"}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {certificate.revokedAt ? (
                      <form
                        action={restoreCertificate.bind(null, certificate.id)}
                      >
                        <SubmitButton
                          className="btn btn-ghost btn-sm"
                          pendingText="Restoring..."
                        >
                          Restore
                          <span className="sr-only"> {certificate.code}</span>
                        </SubmitButton>
                      </form>
                    ) : (
                      <form
                        action={revokeCertificate.bind(null, certificate.id)}
                      >
                        <SubmitButton
                          className="btn btn-ghost btn-sm text-madder"
                          pendingText="Withdrawing..."
                          confirmMessage={`Withdraw the certificate for ${certificate.studentName}? It will stop passing verification immediately.`}
                        >
                          Withdraw
                          <span className="sr-only"> {certificate.code}</span>
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pages"
          className="mt-6 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-ghost btn-sm">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-muted">
            Page {page} of {totalPages}
          </p>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="btn btn-ghost btn-sm">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

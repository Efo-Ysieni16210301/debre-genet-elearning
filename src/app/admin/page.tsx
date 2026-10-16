import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import { resetUserPassword, updateUserRole } from "./actions";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Admin" };

const PAGE_SIZE = 20;

export default async function AdminPage({
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

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const matching = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const [users, roleCounts, courseCount, enrollmentCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.course.count(),
    prisma.enrollment.count(),
  ]);

  const countFor = (role: "STUDENT" | "TEACHER" | "ADMIN") =>
    roleCounts.find((row) => row.role === role)?._count._all ?? 0;

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(target));
    return `/admin?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Administration</h1>

      <nav aria-label="Admin sections" className="mt-4 flex gap-6 text-sm">
        <Link
          href="/admin"
          aria-current="page"
          className="border-b-2 border-saffron py-1 font-bold"
        >
          Users
        </Link>
        <Link
          href="/admin/courses"
          className="border-b-2 border-transparent py-1 font-bold text-muted hover:text-ink"
        >
          Courses
        </Link>
      </nav>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-y border-rule bg-white px-5 py-5 sm:grid-cols-5">
        {[
          ["Students", countFor("STUDENT")],
          ["Teachers", countFor("TEACHER")],
          ["Admins", countFor("ADMIN")],
          ["Courses", courseCount],
          ["Enrollments", enrollmentCount],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-display text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <form method="get" role="search" className="mt-8 flex flex-wrap gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search users by name or email
        </label>
        <input
          id="user-search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="field min-w-0 flex-1 sm:max-w-sm"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {q && (
          <Link href="/admin" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-muted">
        {q
          ? `${matching} ${matching === 1 ? "user matches" : "users match"} "${q}".`
          : `${matching} ${matching === 1 ? "user" : "users"} in total.`}{" "}
        A role change applies the next time that person logs in.
      </p>

      {users.length === 0 ? (
        <p className="mt-6 border border-dashed border-rule bg-white p-8 text-center text-muted">
          No users found.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-3xl text-left text-sm">
            <caption className="sr-only">All user accounts</caption>
            <thead className="border-b border-rule bg-paper">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Password
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {users.map((user) => {
                const isMe = user.id === session.user.id;

                return (
                  <tr key={user.id}>
                    <th scope="row" className="px-4 py-4 align-top font-normal">
                      <p className="font-bold">
                        {user.name}
                        {isMe && (
                          <span className="ml-2 font-normal text-muted">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-muted">{user.email}</p>
                    </th>
                    <td className="px-4 py-4 align-top">
                      <form
                        action={updateUserRole.bind(null, user.id)}
                        className="flex items-center gap-2"
                      >
                        <label htmlFor={`role-${user.id}`} className="sr-only">
                          Role for {user.name}
                        </label>
                        <select
                          id={`role-${user.id}`}
                          name="role"
                          defaultValue={user.role}
                          disabled={isMe}
                          className="field w-auto py-1.5"
                        >
                          <option value="STUDENT">Student</option>
                          <option value="TEACHER">Teacher</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        {!isMe && (
                          <SubmitButton
                            className="btn btn-ghost btn-sm"
                            pendingText="Saving..."
                          >
                            Save
                            <span className="sr-only">
                              {" "}
                              role for {user.name}
                            </span>
                          </SubmitButton>
                        )}
                      </form>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {isMe ? (
                        <Link
                          href="/account"
                          className="font-bold text-lapis underline underline-offset-4"
                        >
                          Change on Account page
                        </Link>
                      ) : (
                        <ResetPasswordButton
                          userName={user.name}
                          action={resetUserPassword.bind(null, user.id)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
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

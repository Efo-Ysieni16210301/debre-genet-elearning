import Link from "next/link";
import { auth } from "@/auth";

import NavLink from "./NavLink";
import MobileMenu from "./MobileMenu";
import { logout } from "@/app/actions/auth";

export default async function Navbar() {
  const session = await auth();
  const role = session?.user.role;
  const canTeach = role === "TEACHER" || role === "ADMIN";
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase() : "";

  const links = (
    <>
      <NavLink href="/courses">Courses</NavLink>
      {session && <NavLink href="/dashboard">Dashboard</NavLink>}
      {canTeach && <NavLink href="/courses/new">New course</NavLink>}
      {role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
    </>
  );

  const account = session ? (
    <>
      <p className="text-sm">
        <Link
          href="/account"
          className="font-bold underline-offset-4 hover:underline"
        >
          {session.user.name}
        </Link>
        <span className="ml-2 border border-rule px-1.5 py-0.5 text-xs text-muted">
          {roleLabel}
        </span>
      </p>
      <form action={logout}>
        <button type="submit" className="btn btn-ghost btn-sm">
          Log out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/login" className="btn btn-ghost btn-sm">
        Log in
      </Link>
      <Link href="/signup" className="btn btn-primary btn-sm">
        Sign up
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-sm bg-lapis font-geez text-xl text-white"
          >
            ደ
          </span>
          <span className="font-display text-lg font-semibold leading-tight">
            Debre Genet
            <span className="block font-sans text-xs font-normal text-muted">
              Sunday School
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {links}
        </nav>

        <div className="hidden items-center gap-3 md:flex">{account}</div>

        <MobileMenu>
          {links}
          <hr className="border-rule" />
          {account}
        </MobileMenu>
      </div>
    </header>
  );
}

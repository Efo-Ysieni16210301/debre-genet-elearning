import Link from "next/link";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { getI18n } from "@/i18n/server";
import NavLink from "./NavLink";
import MobileMenu from "./MobileMenu";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Navbar() {
  const [session, { t }] = await Promise.all([auth(), getI18n()]);
  const role = session?.user.role;
  const canTeach = role === "TEACHER" || role === "ADMIN";

  const links = (
    <>
      <NavLink href="/courses">{t("nav.courses")}</NavLink>
      {session && <NavLink href="/dashboard">{t("nav.dashboard")}</NavLink>}
      {canTeach && <NavLink href="/courses/new">{t("nav.newCourse")}</NavLink>}
      {role === "ADMIN" && <NavLink href="/admin">{t("nav.admin")}</NavLink>}
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
        {role && (
          <span className="ml-2 border border-rule px-1.5 py-0.5 text-xs text-muted">
            {t(`common.roles.${role}`)}
          </span>
        )}
      </p>
      <form action={logout}>
        <button type="submit" className="btn btn-ghost btn-sm">
          {t("nav.logout")}
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/login" className="btn btn-ghost btn-sm">
        {t("nav.login")}
      </Link>
      <Link href="/signup" className="btn btn-primary btn-sm">
        {t("nav.signup")}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-sm bg-lapis font-geez text-xl text-white"
          >
            ደ
          </span>
          <span className="font-display text-lg font-semibold leading-tight">
            {t("nav.brandTop")}
            <span className="block font-sans text-xs font-normal text-muted">
              {t("nav.brandBottom")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("nav.main")}
          className="hidden items-center gap-6 md:flex"
        >
          {links}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="hidden items-center gap-3 md:flex">{account}</div>
          <MobileMenu label={t("common.menu")}>
            {links}
            <hr className="border-rule" />
            {account}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

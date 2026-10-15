"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 py-1 text-[0.95rem] font-bold transition-colors ${
        active
          ? "border-saffron text-ink"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

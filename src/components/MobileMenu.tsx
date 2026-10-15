"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function MobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <details key={pathname} className="relative md:hidden">
      <summary className="btn btn-ghost btn-sm list-none [&::-webkit-details-marker]:hidden">
        Menu
      </summary>
      <div className="absolute right-0 top-full z-20 mt-2 flex w-64 flex-col gap-4 rounded-sm border border-rule bg-white p-5 shadow-lg">
        {children}
      </div>
    </details>
  );
}

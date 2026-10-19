import type { ReactNode } from "react";
import { getI18n } from "@/i18n/server";

export default async function AuthShell({
  heading,
  intro,
  children,
}: {
  heading: string;
  intro: string;
  children: ReactNode;
}) {
  const { t } = await getI18n();

  return (
    <div className="grid md:min-h-136 md:grid-cols-[2fr_3fr]">
      <div className="bg-lapis text-white">
        <div className="mx-auto flex h-full max-w-md flex-col justify-between px-6 py-10 md:py-16">
          <div>
            <p
              lang="am"
              className="font-geez text-4xl leading-tight md:text-5xl"
            >
              ደብረ ገነት
            </p>
            <p className="mt-2 font-display text-xl">
              {t("common.schoolTitle")}
            </p>
          </div>
          <p className="mt-8 hidden max-w-xs text-white/85 md:block">
            {t("auth.shellText")}
          </p>
        </div>
        <div className="tilet" aria-hidden />
      </div>

      <div className="px-5 py-10 md:py-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl font-semibold">{heading}</h1>
          <p className="mt-2 text-muted">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

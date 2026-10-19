import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function Footer() {
  const { t } = await getI18n();

  return (
    <footer className="mt-16 print:hidden">
      <div className="tilet" aria-hidden />
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <p lang="am" className="font-geez text-base text-ink">
            ደብረ ገነት ሰንበት ትምህርት ቤት
          </p>
          <p>{t("footer.tagline")}</p>
          <Link
            href="/verify"
            className="font-bold text-lapis underline underline-offset-4"
          >
            {t("footer.verify")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

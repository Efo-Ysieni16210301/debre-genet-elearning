import { getI18n } from "@/i18n/server";
import { setLocale } from "@/app/actions/locale";

export default async function LanguageSwitcher() {
  const { locale, t } = await getI18n();
  const target = locale === "am" ? "en" : "am";
  const targetName = target === "am" ? "አማርኛ" : "English";

  return (
    <form action={setLocale.bind(null, target)}>
      <button
        type="submit"
        className="rounded-sm border border-rule px-3 py-1.5 text-sm font-bold hover:border-ink"
      >
        <span className="sr-only">{t("nav.language")}: </span>
        <span lang={target}>{targetName}</span>
      </button>
    </form>
  );
}

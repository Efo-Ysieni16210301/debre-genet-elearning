export const LOCALES = ["en", "am"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

export function pickFromAcceptLanguage(header: string): Locale {
  const preferences = header
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest
        .map((item) => item.trim())
        .find((item) => item.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;

      return {
        language: tag.toLowerCase().split("-")[0],
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .filter((item) => item.language !== "" && item.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const match = preferences.find((item) => isLocale(item.language));

  return match && isLocale(match.language) ? match.language : DEFAULT_LOCALE;
}

import type { Locale } from "../i18n/config";

const ZONE = "Africa/Addis_Ababa";

export function formatEthiopianDate(date: Date) {
  const parts = new Intl.DateTimeFormat("am-ET", {
    calendar: "ethiopic",
    timeZone: ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("month")} ${get("day")} ቀን ${get("year")} ዓ.ም`;
}

export function formatDate(date: Date, locale: Locale = "en") {
  if (locale === "am") {
    return formatEthiopianDate(date);
  }

  return date.toLocaleDateString("en-GB", {
    timeZone: ZONE,
    dateStyle: "medium",
  });
}

export function formatDateTime(date: Date, locale: Locale = "en") {
  if (locale === "am") {
    const time = date.toLocaleTimeString("en-GB", {
      timeZone: ZONE,
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formatEthiopianDate(date)}፣ ${time}`;
  }

  return date.toLocaleString("en-GB", {
    timeZone: ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const ZONE = "Africa/Addis_Ababa";

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    timeZone: ZONE,
    dateStyle: "medium",
  });
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("en-GB", {
    timeZone: ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

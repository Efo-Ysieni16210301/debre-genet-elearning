import { headers } from "next/headers";

export async function siteOrigin() {
  const list = await headers();
  const host =
    list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol =
    list.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

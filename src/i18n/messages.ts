import { auth } from "./areas/auth";
import { common } from "./areas/common";
import { courses } from "./areas/courses";
import { footer } from "./areas/footer";
import { home } from "./areas/home";
import { nav } from "./areas/nav";
import type { Locale } from "./config";

export const messages = {
  en: {
    common: common.en,
    nav: nav.en,
    footer: footer.en,
    home: home.en,
    courses: courses.en,
    auth: auth.en,
  },
  am: {
    common: common.am,
    nav: nav.am,
    footer: footer.am,
    home: home.am,
    courses: courses.am,
    auth: auth.am,
  },
};

export type Messages = typeof messages.en;

export const CLIENT_AREAS = ["common", "auth"] as const;

export type ClientArea = (typeof CLIENT_AREAS)[number];

export type ClientMessages = Pick<Messages, ClientArea>;

export function clientMessages(locale: Locale): ClientMessages {
  const source = messages[locale];

  return {
    common: source.common,
    auth: source.auth,
  };
}

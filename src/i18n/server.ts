import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  isLocale,
  pickFromAcceptLanguage,
  type Locale,
} from "./config";
import { messages, type Messages } from "./messages";
import { translate, type Params, type Path } from "./translate";

export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;

  if (isLocale(saved)) {
    return saved;
  }

  const accept = (await headers()).get("accept-language") ?? "";
  return pickFromAcceptLanguage(accept);
}

export async function getI18n() {
  const locale = await getLocale();
  const dictionary = messages[locale];

  const t = (key: Path<Messages>, params?: Params) =>
    translate(dictionary, key, params);

  return { locale, t };
}

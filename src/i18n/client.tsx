"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { ClientMessages } from "./messages";
import { translate, type Params, type Path } from "./translate";

const I18nContext = createContext<{
  locale: Locale;
  messages: ClientMessages;
} | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: ClientMessages;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useT must be used inside I18nProvider.");
  }

  const { locale, messages } = value;

  return {
    locale,
    t: (key: Path<ClientMessages>, params?: Params) =>
      translate(messages, key, params),
  };
}

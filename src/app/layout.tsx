import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import {
  Fraunces,
  Atkinson_Hyperlegible_Next,
  Noto_Serif_Ethiopic,
  Noto_Sans_Ethiopic,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/i18n/client";
import { clientMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

const geez = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-ethiopic",
  display: "swap",
});

const ethiopicSans = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-ethiopic-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const name = t("common.schoolName");

  return {
    title: { default: name, template: `%s | ${name}` },
    description: t("common.description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { locale, t } = await getI18n();

  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable} ${geez.variable} ${ethiopicSans.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <I18nProvider locale={locale} messages={clientMessages(locale)}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
          >
            {t("common.skipToContent")}
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </I18nProvider>
        <Script
          src="https://upload-widget.cloudinary.com/latest/global/all.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

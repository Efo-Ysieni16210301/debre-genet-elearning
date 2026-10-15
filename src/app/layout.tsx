import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import {
  Fraunces,
  Atkinson_Hyperlegible_Next,
  Noto_Serif_Ethiopic,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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

export const metadata: Metadata = {
  title: {
    default: "Debre Genet Sunday School",
    template: "%s | Debre Genet Sunday School",
  },
  description: "Courses, lessons and quizzes from Debre Genet Sunday School.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${geez.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Script
          src="https://upload-widget.cloudinary.com/latest/global/all.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

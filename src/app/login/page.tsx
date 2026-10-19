import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getI18n } from "@/i18n/server";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.login.heading") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, { t }] = await Promise.all([auth(), getI18n()]);

  if (session) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;

  return (
    <AuthShell heading={t("auth.login.heading")} intro={t("auth.login.intro")}>
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

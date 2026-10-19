import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getI18n } from "@/i18n/server";
import AuthShell from "@/components/AuthShell";
import SignupForm from "@/components/SignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signup.heading") };
}

export default async function SignupPage() {
  const [session, { t }] = await Promise.all([auth(), getI18n()]);

  if (session) {
    redirect("/");
  }

  return (
    <AuthShell
      heading={t("auth.signup.heading")}
      intro={t("auth.signup.intro")}
    >
      <SignupForm />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;

  return (
    <AuthShell
      heading="Log in"
      intro="Welcome back. Pick up your lessons where you left off."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

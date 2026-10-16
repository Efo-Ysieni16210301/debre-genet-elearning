import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuthShell from "@/components/AuthShell";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <AuthShell
      heading="Create an account"
      intro="New accounts are student accounts. If you teach here, ask an administrator to change your role after you sign up."
    >
      <SignupForm />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import { changePassword, updateProfile } from "./actions";
import ProfileForm from "@/components/ProfileForm";
import PasswordForm from "@/components/PasswordForm";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    redirect("/login");
  }

  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Your account</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-rule bg-white px-5 py-4 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="font-bold">{user.email}</dd>
        <dt className="text-muted">Role</dt>
        <dd className="font-bold">{roleLabel}</dd>
        <dt className="text-muted">Member since</dt>
        <dd className="font-bold">{formatDate(user.createdAt)}</dd>
      </dl>

      <section aria-labelledby="name-heading" className="mt-10">
        <h2 id="name-heading" className="font-display text-2xl font-semibold">
          Your name
        </h2>
        <p className="mt-1 text-sm text-muted">
          This name appears on your certificates and in your teachers&apos;
          lists.
        </p>
        <div className="mt-4 border border-rule bg-white p-5">
          <ProfileForm initialName={user.name} action={updateProfile} />
        </div>
      </section>

      <section aria-labelledby="password-heading" className="mt-10">
        <h2
          id="password-heading"
          className="font-display text-2xl font-semibold"
        >
          Change your password
        </h2>
        <div className="mt-4 border border-rule bg-white p-5">
          <PasswordForm action={changePassword} />
        </div>
      </section>
    </div>
  );
}

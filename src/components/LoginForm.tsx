"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useT } from "@/i18n/client";
import PasswordField from "./PasswordField";

function destination(callbackUrl: string | undefined) {
  if (!callbackUrl) return "/";

  try {
    const url = new URL(callbackUrl, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}`
      : "/";
  } catch {
    return "/";
  }
}

export default function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const { t } = useT();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth.login.error"));
        setPending(false);
        return;
      }

      router.push(destination(callbackUrl));
      router.refresh();
    } catch {
      setError(t("auth.network"));
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="border-l-4 border-madder bg-madder/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-sm font-bold">
          {t("auth.email")}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="field"
        />
      </div>

      <PasswordField
        label={t("auth.password")}
        name="password"
        autoComplete="current-password"
      />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? t("auth.login.pending") : t("auth.login.submit")}
      </button>

      <p className="text-sm text-muted">
        {t("auth.login.newHere")}{" "}
        <Link
          href="/signup"
          className="font-bold text-lapis underline underline-offset-4"
        >
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </form>
  );
}

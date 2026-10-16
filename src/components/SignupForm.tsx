"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import PasswordField from "./PasswordField";

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/courses");
      router.refresh();
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
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
        <label htmlFor="signup-name" className="mb-1.5 block text-sm font-bold">
          Full name
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          className="field"
        />
      </div>

      <div>
        <label
          htmlFor="signup-email"
          className="mb-1.5 block text-sm font-bold"
        >
          Email
        </label>
        <input
          id="signup-email"
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
        label="Password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters."
      />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? "Creating your account..." : "Create account"}
      </button>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-lapis underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

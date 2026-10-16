"use client";

import { useState, type FormEvent } from "react";
import type { FormResult } from "@/lib/form-result";
import PasswordField from "./PasswordField";

export default function PasswordForm({
  action,
}: {
  action: (formData: FormData) => Promise<FormResult>;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setMessage(null);
    setPending(true);

    try {
      const result = await action(new FormData(form));

      if (result.ok) {
        form.reset();
        setMessage({ kind: "success", text: "Your password was changed." });
      } else {
        setMessage({ kind: "error", text: result.message });
      }
    } catch {
      setMessage({
        kind: "error",
        text: "Could not reach the server. Please try again.",
      });
    }

    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "border-l-4 border-madder bg-madder/10 px-3 py-2 text-sm"
              : "border-l-4 border-fern bg-fern/10 px-3 py-2 text-sm"
          }
        >
          {message.text}
        </p>
      )}

      <PasswordField
        label="Current password"
        name="current"
        autoComplete="current-password"
      />
      <PasswordField
        label="New password"
        name="next"
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters."
      />
      <PasswordField
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
        minLength={8}
      />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-sm"
      >
        {pending ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}

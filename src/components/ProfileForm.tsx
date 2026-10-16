"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormResult } from "@/lib/form-result";

export default function ProfileForm({
  initialName,
  action,
}: {
  initialName: string;
  action: (formData: FormData) => Promise<FormResult>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const result = await action(new FormData(event.currentTarget));

      if (result.ok) {
        setMessage({ kind: "success", text: "Your name was updated." });
        router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
        <label
          htmlFor="account-name"
          className="mb-1.5 block text-sm font-bold"
        >
          Full name
        </label>
        <input
          id="account-name"
          name="name"
          defaultValue={initialName}
          autoComplete="name"
          required
          maxLength={100}
          className="field"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-sm"
      >
        {pending ? "Saving..." : "Save name"}
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormResult } from "@/lib/form-result";

export default function GradeForm({
  action,
  maxPoints,
  initialPoints,
  initialFeedback,
  label,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  maxPoints: number;
  initialPoints: number | null;
  initialFeedback: string;
  label: string;
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
        setMessage({ kind: "success", text: "Saved." });
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`px-3 py-2 text-sm ${
            message.kind === "error"
              ? "border-l-4 border-madder bg-madder/10"
              : "border-l-4 border-fern bg-fern/10"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor={`points-${label}`}
            className="mb-1.5 block text-sm font-bold"
          >
            Mark (out of {maxPoints})
          </label>
          <input
            id={`points-${label}`}
            name="points"
            type="number"
            min={0}
            max={maxPoints}
            step={0.5}
            required
            defaultValue={initialPoints ?? ""}
            className="field w-28"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`feedback-${label}`}
          className="mb-1.5 block text-sm font-bold"
        >
          Feedback for the student{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`feedback-${label}`}
          name="feedback"
          rows={3}
          maxLength={1000}
          defaultValue={initialFeedback}
          className="field"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-sm"
      >
        {pending ? "Saving..." : "Save mark"}
      </button>
    </form>
  );
}

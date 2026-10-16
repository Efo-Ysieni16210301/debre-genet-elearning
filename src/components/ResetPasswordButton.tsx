"use client";

import { useState, useTransition } from "react";
import type { ResetResult } from "@/lib/form-result";

export default function ResetPasswordButton({
  userName,
  action,
}: {
  userName: string;
  action: () => Promise<ResetResult>;
}) {
  const [result, setResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    const confirmed = window.confirm(
      `Create a new temporary password for ${userName}? Their current password will stop working.`,
    );

    if (!confirmed) return;

    setCopied(false);

    startTransition(async () => {
      try {
        setResult(await action());
      } catch {
        setResult({
          ok: false,
          message: "Something went wrong. Please try again.",
        });
      }
    });
  }

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="btn btn-ghost btn-sm"
      >
        {pending ? "Working..." : "Reset password"}
        <span className="sr-only"> for {userName}</span>
      </button>

      {result && (
        <div
          role="status"
          className={`mt-3 max-w-xs border-l-4 px-3 py-2 text-sm ${
            result.ok ? "border-fern bg-fern/10" : "border-madder bg-madder/10"
          }`}
        >
          {result.ok ? (
            <>
              <p>Temporary password for {userName}:</p>
              <p className="mt-1 select-all font-mono text-base font-bold tracking-wide">
                {result.password}
              </p>
              <p className="mt-2 text-muted">
                Copy it now. It will not be shown again. Ask them to change it
                on their Account page after logging in.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => copy(result.password)}
                  className="btn btn-primary btn-sm"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="btn btn-ghost btn-sm"
                >
                  Hide
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{result.message}</p>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="btn btn-ghost btn-sm mt-3"
              >
                Hide
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

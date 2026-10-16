"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingText = "Saving...",
  className = "btn btn-primary",
  confirmMessage,
  disabled = false,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

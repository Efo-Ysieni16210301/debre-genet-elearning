"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";

export default function PasswordField({
  label,
  name,
  autoComplete,
  hint,
  minLength,
}: {
  label: string;
  name: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
}) {
  const id = useId();
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="field pr-16"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? t("auth.hideLabel") : t("auth.showLabel")}
          className="absolute inset-y-0 right-0 px-3 text-sm font-bold text-lapis"
        >
          {visible ? t("auth.hide") : t("auth.show")}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

"use client";

import { useId, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Textarea({
  label,
  error,
  hint,
  className = "",
  id: idProp,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-muted"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full resize-y rounded-md border bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted ${
          error
            ? "border-danger/60 focus:border-danger focus:shadow-[0_0_0_3px_var(--ring-danger)]"
            : "border-edge hover:border-edge-strong focus:border-ink/40 focus:shadow-[0_0_0_3px_var(--ring-soft)]"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="animate-fade text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

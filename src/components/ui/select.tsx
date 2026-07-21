"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Select({
  label,
  error,
  hint,
  className = "",
  id: idProp,
  children,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full appearance-none rounded-md border bg-surface px-3.5 pr-10 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-out ${
            error
              ? "border-danger/60 focus:border-danger focus:shadow-[0_0_0_3px_var(--ring-danger)]"
              : "border-edge hover:border-edge-strong focus:border-ink/40 focus:shadow-[0_0_0_3px_var(--ring-soft)]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
      </div>
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

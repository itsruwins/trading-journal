"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[-0.01em] transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const sizes = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-4 text-[15px]",
};

const variants = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary:
    "border border-edge-strong bg-transparent text-ink hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  // Saturated red fill wants white text in both themes.
  danger: "bg-negative text-white hover:opacity-90",
};

/* The content span is a flex row: Tailwind preflight makes svg display:block,
   which would otherwise stack an icon above the label inside a plain span.
   A leading icon also gets a small negative offset so the padding reads
   optically even (icons carry less visual weight than glyphs). */
const content =
  "inline-flex items-center gap-2 [&>svg]:-ml-0.5 [&>svg]:size-4 [&>svg]:shrink-0";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        {...props}
      >
        {loading && <Spinner className="size-4 shrink-0" />}
        <span className={`${content} ${loading ? "opacity-70" : ""}`}>
          {children}
        </span>
      </button>
    );
  },
);

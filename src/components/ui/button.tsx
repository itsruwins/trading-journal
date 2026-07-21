"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const sizes = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px]",
};

const variants = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary:
    "border border-edge-strong bg-transparent text-ink hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "bg-negative text-white hover:opacity-90",
};

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
        {loading && <Spinner className="size-4" />}
        <span className={loading ? "opacity-70" : undefined}>{children}</span>
      </button>
    );
  },
);

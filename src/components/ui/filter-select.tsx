"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

/** Compact select for toolbar filter rows; form fields use Select instead. */
export function FilterSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="h-9 w-full appearance-none rounded-md border border-edge bg-surface pl-3 pr-8 text-[13px] text-ink outline-none transition-colors duration-150 ease-out hover:border-edge-strong focus:border-accent/60"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
    </div>
  );
}

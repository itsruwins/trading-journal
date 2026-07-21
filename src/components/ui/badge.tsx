import type { ReactNode } from "react";

const variants = {
  neutral: "border border-edge bg-white/5 text-muted",
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
};

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

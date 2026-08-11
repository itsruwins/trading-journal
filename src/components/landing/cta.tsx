import Link from "next/link";
import { cn } from "@/src/lib/cn";

/* Link-shaped twin of src/components/ui/button.tsx. The Button component
   renders a real <button>, and every call to action on this page navigates —
   so these carry the same geometry, the same 150ms ease-out, and the same
   press scale, on an anchor that right-click and cmd-click still understand. */

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[-0.01em] transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100";

const SIZES = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-[15px]",
};

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-edge-strong bg-transparent text-ink hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
};

export function CtaLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
    >
      {children}
    </Link>
  );
}

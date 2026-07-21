import type { ReactNode } from "react";

export function Card({
  title,
  action,
  className = "",
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-edge bg-surface ${className}`}
    >
      {(title || action) && (
        <header className="flex h-12 items-center justify-between gap-4 border-b border-edge px-5">
          {title && (
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

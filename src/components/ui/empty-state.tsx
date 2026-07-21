import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-rise flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-95 text-[14px] leading-relaxed text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

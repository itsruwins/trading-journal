"use client";

export function TagChip({
  name,
  color,
  selected = false,
  onClick,
}: {
  name: string;
  color: string | null;
  selected?: boolean;
  onClick?: () => void;
}) {
  const dot = (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={{ background: color ?? "oklch(0.5 0 0)" }}
    />
  );

  const base =
    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors duration-150 ease-out";

  if (!onClick) {
    return (
      <span className={`${base} border-edge text-muted`}>
        {dot}
        {name}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} active:scale-[0.98] ${
        selected
          ? "border-ink/40 bg-selected text-ink"
          : "border-edge text-muted hover:border-edge-strong hover:text-ink"
      }`}
    >
      {dot}
      {name}
    </button>
  );
}

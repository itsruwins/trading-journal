"use client";

export function WinLossBar({
  wins,
  losses,
  breakeven,
}: {
  wins: number;
  losses: number;
  breakeven: number;
}) {
  const total = wins + losses + breakeven;
  if (total === 0) return null;

  const segments = [
    { label: "Wins", count: wins, color: "var(--positive)" },
    { label: "Breakeven", count: breakeven, color: "var(--faint)" },
    { label: "Losses", count: losses, color: "var(--negative)" },
  ].filter((s) => s.count > 0);

  return (
    <div>
      <div
        role="img"
        aria-label={`${wins} wins, ${breakeven} breakeven, ${losses} losses`}
        className="flex h-4 gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <div
            key={s.label}
            style={{
              width: `${(s.count / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between text-[13px]"
          >
            <span className="flex items-center gap-2 text-muted">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
            <span className="tabular text-ink">
              {s.count}
              <span className="ml-1.5 text-faint">
                {Math.round((s.count / total) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

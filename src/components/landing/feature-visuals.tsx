import { Fragment } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { TagChip } from "@/src/components/ui/tag-chip";
import { CALENDAR, SETUPS, signedMoney } from "./sample-data";

/* Each feature gets its own visual rather than an icon in a rounded square.
   The rule the whole page runs on holds here too: green and red appear only on
   figures that represent money. Everything structural stays at zero chroma. */

export function CalendarVisual() {
  /* Mon–Fri plus a weekly total, the same six-column shape the real calendar
     uses. The summary column drops below sm, where six columns of currency
     would be illegible — again matching the app. */
  const weeks = [0, 1, 2, 3].map((w) => CALENDAR.slice(w * 5, w * 5 + 5));

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6" aria-hidden="true">
      {["M", "T", "W", "T", "F"].map((day, i) => (
        <div
          key={`${day}-${i}`}
          className="pb-0.5 text-center text-[10px] font-medium text-faint"
        >
          {day}
        </div>
      ))}
      <div className="hidden pb-0.5 text-center text-[10px] font-medium text-faint sm:block">
        Week
      </div>

      {weeks.map((week, w) => {
        const total = week.reduce<number>((sum, value) => sum + (value ?? 0), 0);
        return (
          <Fragment key={w}>
            {week.map((value, d) => {
              const positive = value != null && value > 0;
              const negative = value != null && value < 0;
              return (
                <div
                  key={d}
                  className={cn(
                    "flex aspect-square flex-col justify-between rounded-md p-1.5 sm:aspect-[3/2] sm:p-2",
                    positive
                      ? "bg-positive/12"
                      : negative
                        ? "bg-negative/12"
                        : "bg-wash",
                  )}
                >
                  {/* --muted, not --faint: over the tinted P&L wells these
                      10px numerals measure 4.3:1 on --faint, just under the
                      4.5:1 floor. --muted clears it at ~6:1. */}
                  <span className="text-[10px] leading-none text-muted">
                    {w * 7 + d + 3}
                  </span>
                  {value != null && (
                    <span
                      className={cn(
                        "tabular truncate text-[10px] font-semibold leading-none sm:text-[11px]",
                        positive ? "text-positive" : "text-negative",
                      )}
                    >
                      {signedMoney(value)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="hidden aspect-[3/2] flex-col items-center justify-center rounded-md bg-wash p-1 sm:flex">
              <span
                className={cn(
                  "tabular truncate text-[11px] font-semibold",
                  total >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {signedMoney(total)}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

const SESSIONS = [
  { name: "London", value: 2240, count: 18 },
  { name: "New York", value: 1420, count: 12 },
  { name: "Asia", value: -210, count: 5 },
];

/* Diverging bars around a zero line placed in proportion to the data, rather
   than pinned to the middle of the track. A centred baseline would spend half
   the width on a loss column that only needs a sixth of it. */
function DivergingRow({
  name,
  value,
  count,
  zero,
  scale,
}: {
  name: string;
  value: number;
  count: number;
  /** Percentage from the left where zero falls. */
  zero: number;
  /** Percentage of track width per unit of value. */
  scale: number;
}) {
  const positive = value >= 0;
  const width = `${Math.abs(value) * scale}%`;
  return (
    <li className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-[12px] text-muted sm:w-28 sm:text-[13px]">
        {name}
      </span>
      <span className="relative h-5 min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-edge-strong"
          style={{ left: `${zero}%` }}
        />
        <span
          className={cn(
            "absolute inset-y-1",
            positive
              ? "bg-positive rounded-r-[3px]"
              : "bg-negative rounded-l-[3px]",
          )}
          style={
            positive
              ? { left: `${zero}%`, width }
              : { right: `${100 - zero}%`, width }
          }
        />
      </span>
      <span className="tabular w-8 shrink-0 text-right text-[12px] text-faint">
        {count}
      </span>
      <span
        className={cn(
          "tabular w-[68px] shrink-0 text-right text-[12px] font-medium sm:text-[13px]",
          positive ? "text-positive" : "text-negative",
        )}
      >
        {signedMoney(value)}
      </span>
    </li>
  );
}

function divergingScale(values: number[]) {
  const posMax = Math.max(0, ...values);
  const negMax = Math.max(0, ...values.map((v) => -v));
  const span = posMax + negMax || 1;
  return { zero: (negMax / span) * 100, scale: 100 / span };
}

export function SetupsVisual() {
  const setupScale = divergingScale(SETUPS.map((s) => s.value));
  const sessionScale = divergingScale(SESSIONS.map((s) => s.value));

  return (
    <div className="space-y-5">
      <ul className="space-y-2.5">
        {SETUPS.map((setup) => (
          <DivergingRow key={setup.name} {...setup} {...setupScale} />
        ))}
      </ul>

      <div className="border-t border-edge pt-4">
        <p className="mb-2.5 text-[12px] text-faint">By session</p>
        <ul className="space-y-2.5">
          {SESSIONS.map((session) => (
            <DivergingRow key={session.name} {...session} {...sessionScale} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TagsVisual() {
  const tags: { name: string; color: string }[] = [
    { name: "Followed plan", color: "oklch(0.72 0.15 160)" },
    { name: "Early entry", color: "oklch(0.7 0.16 60)" },
    { name: "Revenge trade", color: "oklch(0.67 0.19 25)" },
    { name: "A+ setup", color: "oklch(0.7 0.13 250)" },
    { name: "News risk", color: "oklch(0.75 0.14 90)" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagChip key={tag.name} name={tag.name} color={tag.color} />
      ))}
    </div>
  );
}

/* A chart thumbnail as it appears attached to a trade. Deliberately achromatic
   — it stands in for a screenshot, and a screenshot isn't a P&L figure. */
function CandleThumb({ className }: { className?: string }) {
  const candles = [
    [30, 62, 40, 54], [28, 58, 36, 44], [34, 66, 44, 60], [40, 72, 52, 50],
    [36, 60, 42, 56], [44, 78, 54, 70], [52, 84, 62, 66], [48, 76, 56, 72],
    [56, 90, 66, 82], [62, 96, 74, 78], [58, 88, 68, 86], [66, 102, 78, 94],
  ];
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-edge-strong bg-raised",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex h-5 shrink-0 items-center gap-1.5 border-b border-edge px-2">
        <span className="text-[9px] font-medium text-faint">GBPUSD · M15</span>
      </div>
      {/* min-h-0 so the svg takes the height left over by the header rather
          than its own intrinsic size, which would push it out of the frame. */}
      <svg
        viewBox="0 0 200 110"
        className="min-h-0 w-full flex-1"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          x2="200"
          y1="64"
          y2="64"
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        {candles.map(([low, high, open, close], i) => {
          const x = 10 + i * 15.5;
          const up = close >= open;
          return (
            <g key={i} opacity={up ? 0.85 : 0.5}>
              <line
                x1={x}
                x2={x}
                y1={110 - high}
                y2={110 - low}
                stroke="var(--muted)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={x - 3.5}
                y={110 - Math.max(open, close)}
                width="7"
                height={Math.max(2, Math.abs(close - open))}
                fill={up ? "var(--ink)" : "var(--faint)"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ScreenshotsVisual() {
  return (
    <div className="relative h-32 sm:h-36" aria-hidden="true">
      <CandleThumb className="absolute left-6 top-0 h-24 w-[62%] rotate-[-3deg] opacity-60 sm:h-28" />
      <CandleThumb className="absolute right-0 top-4 h-24 w-[62%] rotate-[2.5deg] shadow-[0_16px_36px_-12px_oklch(0_0_0/0.7)] sm:h-28" />
      <span className="absolute bottom-0 left-0 inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-2.5 py-1 text-[11px] text-muted">
        <Camera className="size-3.5" />2 attached
      </span>
    </div>
  );
}

export function AccountsVisual() {
  const accounts = [
    { name: "FTMO 100K", currency: "USD", value: 8420, badge: "Funded" },
    { name: "Personal", currency: "EUR", value: 1265, badge: "Live" },
    { name: "Challenge #3", currency: "USD", value: -310, badge: "Demo" },
  ];
  return (
    <ul className="space-y-1.5">
      {accounts.map((account) => (
        <li
          key={account.name}
          className="flex items-center gap-2.5 rounded-md border border-edge bg-canvas px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
            {account.name}
          </span>
          <span className="shrink-0 rounded-full border border-edge px-2 py-0.5 text-[10px] text-faint">
            {account.badge}
          </span>
          <span
            className={cn(
              "tabular w-20 shrink-0 text-right text-[13px] font-medium",
              account.value >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {account.value >= 0 ? "" : "−"}
            {account.currency === "EUR" ? "€" : "$"}
            {Math.abs(account.value).toLocaleString("en-US")}
          </span>
        </li>
      ))}
    </ul>
  );
}

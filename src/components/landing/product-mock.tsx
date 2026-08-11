import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/src/lib/cn";
import {
  AVG_R,
  BLOTTER,
  CLOSED,
  EQUITY,
  MONTHS,
  NET,
  PROFIT_FACTOR,
  WIN_RATE,
  money,
  signedMoney,
} from "./sample-data";

/* The hero's product render.

   Not a screenshot: real markup, the app's own tokens, the app's own chart
   language. That means it stays sharp at any density, follows the palette if
   the tokens ever change, and can't drift out of date the way a PNG does.

   The curve is drawn with preserveAspectRatio="none" so it stretches to the
   container at any width — which is why the stroke carries non-scaling-stroke
   and why the y-axis labels are HTML in a gutter rather than <text> inside the
   viewBox: text would shear with the aspect ratio, a path won't. */

const VB_W = 640;
const VB_H = 200;
const TICK_STEP = 1500;

const HI = Math.max(TICK_STEP, Math.ceil(Math.max(...EQUITY) / TICK_STEP) * TICK_STEP);
const TICKS = Array.from({ length: HI / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);

const px = (i: number) => (i / (EQUITY.length - 1)) * VB_W;
const py = (value: number) => VB_H - (value / HI) * VB_H;

const LINE = EQUITY.map(
  (value, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(value).toFixed(1)}`,
).join("");
const AREA = `${LINE}L${VB_W},${VB_H}L0,${VB_H}Z`;

/* Where the zero line sits in the monthly chart: the two halves grow in
   proportion to the largest win and the largest loss in the series. */
const MONTH_PEAK = Math.max(...MONTHS.map((m) => Math.abs(m.value)));
const POS_SHARE = Math.max(...MONTHS.map((m) => Math.max(0, m.value)));
const NEG_SHARE = Math.max(...MONTHS.map((m) => Math.max(0, -m.value)));

function compact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  return abs >= 1000
    ? `${sign}${Math.round(abs / 100) / 10}k`
    : `${sign}${abs}`;
}

function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "positive";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-edge bg-surface p-3 sm:p-4">
      <p className="truncate text-[11px] font-medium text-faint sm:text-[12px]">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1.5 truncate text-[17px] font-semibold tracking-[-0.02em] sm:text-xl",
          tone === "positive" ? "text-positive" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-faint sm:text-[12px]">
        {detail}
      </p>
    </div>
  );
}

export function ProductMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-edge-strong bg-canvas shadow-[0_40px_100px_-32px_oklch(0_0_0/0.85)] sm:rounded-2xl">
      {/* Window chrome — the app's real translucent bar, at mock scale. */}
      <div className="glass-bar flex h-11 items-center gap-2.5 px-3 sm:h-12 sm:px-4">
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="var(--ink)" />
          <rect x="7" y="15" width="3" height="6" rx="1.5" fill="var(--canvas)" />
          <rect x="12.5" y="11" width="3" height="10" rx="1.5" fill="var(--canvas)" />
          <rect x="18" y="7" width="3" height="14" rx="1.5" fill="var(--canvas)" />
        </svg>
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
          Dashboard
        </span>
        <span className="ml-auto rounded-full border border-edge px-2 py-0.5 text-[10px] font-medium text-faint">
          Sample data
        </span>
        <span
          className="hidden size-6 shrink-0 rounded-full border border-edge-strong bg-raised sm:block"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatTile
            label="Net P&L"
            value={money(NET)}
            detail={`${CLOSED} closed trades`}
            tone="positive"
          />
          <StatTile
            label="Win rate"
            value={`${WIN_RATE}%`}
            detail={`${CLOSED} closed`}
          />
          <StatTile
            label="Profit factor"
            value={PROFIT_FACTOR.toFixed(2)}
            detail="Gross win ÷ gross loss"
          />
          <StatTile label="Avg R" value={`${AVG_R.toFixed(2)}R`} detail="Per closed trade" />
        </div>

        <section className="rounded-lg border border-edge bg-surface">
          <header className="flex h-10 items-center justify-between gap-3 border-b border-edge px-3 sm:h-12 sm:px-4">
            <p className="text-[12px] font-semibold tracking-[-0.01em] text-ink sm:text-[14px]">
              Equity curve
            </p>
            <span className="text-[11px] text-faint sm:text-[12px]">All accounts</span>
          </header>

          <div className="p-3 sm:p-4">
            <div className="relative pl-8 sm:pl-10">
              {TICKS.map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="tabular absolute left-0 -translate-y-1/2 text-[10px] text-faint"
                  style={{ top: `${(1 - tick / HI) * 100}%` }}
                >
                  {compact(tick)}
                </span>
              ))}

              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                className="h-[128px] w-full sm:h-[172px]"
                role="img"
                aria-label={`Equity curve of sample data rising to ${money(NET)} over ${CLOSED} closed trades`}
              >
                {TICKS.map((tick) => (
                  <line
                    key={tick}
                    x1="0"
                    x2={VB_W}
                    y1={py(tick)}
                    y2={py(tick)}
                    stroke="var(--edge)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* fill-opacity, not opacity: the entrance animation owns the
                    element's `opacity` and would otherwise blow the wash out
                    to a solid slab the moment it finished. */}
                <path
                  d={AREA}
                  fill="var(--chart-line)"
                  fillOpacity="0.1"
                  className="landing-line"
                  style={{ "--line-delay": "900ms" } as React.CSSProperties}
                />
                <path
                  d={LINE}
                  pathLength="1"
                  fill="none"
                  stroke="var(--chart-line)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="landing-draw"
                  style={{ "--line-delay": "520ms" } as React.CSSProperties}
                />
              </svg>

              <div className="mt-1.5 flex justify-between text-[10px] text-faint">
                <span>3 Mar</span>
                <span>29 Aug</span>
              </div>
            </div>
          </div>
        </section>

        <div className="hidden gap-3 md:grid md:grid-cols-5">
          <section className="rounded-lg border border-edge bg-surface md:col-span-2">
            <header className="flex h-10 items-center border-b border-edge px-3">
              <p className="text-[12px] font-semibold tracking-[-0.01em] text-ink">
                Monthly P&L
              </p>
            </header>
            {/* A real zero line, split proportionally: a losing month has to
                hang below the baseline, not read as a short winning one. The
                two halves are grown by the data rather than fixed at 50/50, so
                no vertical space is wasted when the losses are small.

                items-stretch (the default, hence no items-end here): the bars
                size as a percentage of their column, so the columns have to be
                stretched to the row height first or the percentage resolves
                against nothing. */}
            <div className="flex h-[104px] gap-2 p-3">
              {MONTHS.map((month, i) => {
                const positive = month.value >= 0;
                const share = `${(Math.abs(month.value) / MONTH_PEAK) * 100}%`;
                const bar = (
                  <div
                    className={cn(
                      "landing-grow mx-auto w-full max-w-7",
                      positive
                        ? "bg-positive origin-bottom rounded-t-[3px]"
                        : "bg-negative origin-top rounded-b-[3px]",
                    )}
                    style={
                      {
                        height: share,
                        "--line-delay": `${1100 + i * 60}ms`,
                      } as React.CSSProperties
                    }
                    title={`${month.label}: ${signedMoney(month.value)}`}
                  />
                );

                return (
                  <div key={month.label} className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-1 flex-col">
                      <div
                        className="flex flex-col justify-end"
                        style={{ flexGrow: POS_SHARE }}
                      >
                        {positive && bar}
                      </div>
                      <div className="h-px shrink-0 bg-edge-strong" />
                      <div style={{ flexGrow: NEG_SHARE }}>{!positive && bar}</div>
                    </div>
                    <span className="text-center text-[10px] text-faint">
                      {month.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-edge bg-surface md:col-span-3">
            <header className="flex h-10 items-center border-b border-edge px-3">
              <p className="text-[12px] font-semibold tracking-[-0.01em] text-ink">
                Recent trades
              </p>
            </header>
            <div className="divide-y divide-edge">
              {BLOTTER.map((trade) => {
                const positive = trade.pnl >= 0;
                const Arrow = trade.direction === "Buy" ? ArrowUpRight : ArrowDownRight;
                return (
                  <div
                    key={trade.pair}
                    className="flex items-center gap-3 px-3 py-[9px]"
                  >
                    <Arrow
                      className={cn(
                        "size-3.5 shrink-0",
                        trade.direction === "Buy" ? "text-positive" : "text-negative",
                      )}
                      aria-hidden="true"
                    />
                    <span className="w-[68px] shrink-0 truncate text-[12px] font-medium text-ink">
                      {trade.pair}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
                      {trade.setup}
                    </span>
                    <span className="tabular hidden w-10 shrink-0 text-right text-[11px] text-faint lg:block">
                      {trade.rr > 0 ? `+${trade.rr}R` : `${trade.rr}R`}
                    </span>
                    <span
                      className={cn(
                        "tabular w-[68px] shrink-0 text-right text-[12px] font-medium",
                        positive ? "text-positive" : "text-negative",
                      )}
                    >
                      {signedMoney(trade.pnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

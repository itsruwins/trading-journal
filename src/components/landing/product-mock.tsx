import { Plus } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Card } from "@/src/components/ui/card";
import { EquityCurve } from "@/src/components/charts/equity-curve";
import { MonthlyBars } from "@/src/components/charts/monthly-bars";
import { AccountSnapshot } from "@/src/components/dashboard/account-snapshot";
import {
  AVG_R,
  BEST_SESSION,
  BEST_SETUP,
  CLOSED,
  EQUITY_POINTS,
  LOSSES,
  MONTH_BARS,
  NET,
  PROFIT_FACTOR,
  SAMPLE_ACCOUNT,
  WINS,
  WIN_RATE,
  money,
} from "./sample-data";

/* The hero's product render — the actual dashboard, not a lookalike.

   AccountSnapshot, Card, EquityCurve and MonthlyBars are the components the
   real /dashboard renders, fed sample data in the app's own types. The tile
   grid below mirrors the dashboard's markup exactly, down to the double-width
   Total profit tile. If those components change, this changes with them, which
   is the whole point: a hand-drawn imitation drifts, this can't.

   The two charts gate their own render on a ResizeObserver measurement, so
   they draw nothing server-side and fill in on mount. That's why each one sits
   in a height-reserved box — otherwise the hero would jump as they arrive. */

const CHART_HEIGHT = 180;

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-edge bg-surface p-4">
      <p className="truncate text-[12px] font-medium text-faint">{label}</p>
      <p className="mt-1.5 truncate text-xl font-semibold tracking-[-0.01em] text-ink">
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[12px] text-faint">{detail}</p>}
    </div>
  );
}

export function ProductMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-edge-strong bg-canvas shadow-[0_40px_100px_-32px_var(--mock-shadow)] sm:rounded-2xl">
      {/* Window chrome — the app's real translucent topbar, at mock scale. */}
      <div className="glass-bar flex h-12 items-center gap-2.5 px-3 sm:px-4">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="var(--ink)" />
          <rect x="7" y="15" width="3" height="6" rx="1.5" fill="var(--canvas)" />
          <rect x="12.5" y="11" width="3" height="10" rx="1.5" fill="var(--canvas)" />
          <rect x="18" y="7" width="3" height="14" rx="1.5" fill="var(--canvas)" />
        </svg>
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
          Dashboard
        </span>
        <span className="ml-auto rounded-full border border-edge px-2 py-0.5 text-[10px] font-medium text-faint">
          Sample data
        </span>
        <span
          className="hidden size-7 shrink-0 rounded-full border border-edge-strong bg-raised sm:block"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {/* The dashboard's greeting row. */}
        <div className="hidden items-center justify-between gap-3 sm:flex">
          <p className="text-[14px] text-muted">
            Good afternoon, <span className="font-medium text-ink">ruwins</span>!
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-edge-strong px-3 text-[13px] font-medium text-ink">
              <Plus className="-ml-0.5 size-3.5" aria-hidden="true" />
              Add account
            </span>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-fg">
              <Plus className="-ml-0.5 size-3.5" aria-hidden="true" />
              Log trade
            </span>
          </div>
        </div>

        <AccountSnapshot account={SAMPLE_ACCOUNT} />

        {/* Same grid, same order, same double-width first tile as /dashboard. */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="col-span-2 flex min-w-0 flex-col justify-center rounded-lg border border-edge bg-surface p-4">
            <p className="text-[12px] font-medium text-faint">Total profit</p>
            <p className="tabular mt-1.5 truncate text-3xl font-semibold leading-none tracking-[-0.02em] text-positive">
              {money(NET)}
            </p>
            <p className="mt-2 text-[12px] text-faint">{CLOSED} closed trades</p>
          </div>
          <StatTile label="Total trades" value={String(CLOSED)} detail={`${CLOSED} closed`} />
          <StatTile label="Win rate" value={`${WIN_RATE}%`} detail={`${WINS}W · ${LOSSES}L`} />
          <StatTile label="Profit factor" value={PROFIT_FACTOR.toFixed(2)} />
          <StatTile label="Average RR" value={`${AVG_R.toFixed(2)}R`} />
          <StatTile
            label="Best setup"
            value={BEST_SETUP.name}
            detail={money(BEST_SETUP.value)}
          />
          <StatTile
            label="Best session"
            value={BEST_SESSION.name}
            detail={money(BEST_SESSION.value)}
          />
        </div>

        {/* The calendar sits between the tiles and the charts on the real
            dashboard. It's left out here and given the features section
            instead: at its true cell height it would nearly double the hero. */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <Card title="Equity curve">
            <ChartFrame>
              <EquityCurve points={EQUITY_POINTS} height={CHART_HEIGHT} />
            </ChartFrame>
          </Card>
          <Card title="Monthly performance">
            <ChartFrame>
              <MonthlyBars bars={MONTH_BARS} height={CHART_HEIGHT} />
            </ChartFrame>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Holds the chart's height open while it waits for its first measurement. */
function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("w-full")} style={{ minHeight: CHART_HEIGHT }}>
      {children}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { getProfile } from "@/src/lib/profile";
import { listAccounts, type Account } from "@/src/lib/accounts";
import { listTrades, type Trade } from "@/src/lib/trades";
import {
  commonCurrency,
  computeStats,
  equityPoints,
  filterTrades,
  monthlyPnl,
  RANGES,
  type RangeKey,
} from "@/src/lib/stats";
import { formatMoney } from "@/src/lib/format";
import { signedCompact } from "@/src/components/charts/chart-utils";
import { EquityCurve } from "@/src/components/charts/equity-curve";
import { MonthlyBars } from "@/src/components/charts/monthly-bars";
import { PnlCalendar } from "@/src/components/dashboard/pnl-calendar";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { FilterSelect } from "@/src/components/ui/filter-select";
import { useToast } from "@/src/components/ui/toast";

function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <p className="text-[12px] font-medium text-faint">{label}</p>
      <p
        className={`mt-1.5 truncate text-xl font-semibold tracking-[-0.01em] ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-ink"
        }`}
      >
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[12px] text-faint">{detail}</p>}
    </div>
  );
}

function money(value: number, currency: string | null): string {
  return currency ? formatMoney(value, currency) : signedCompact(value);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [loaded, setLoaded] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [range, setRange] = useState<RangeKey>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listTrades(), listAccounts(), getProfile(user.id)])
      .then(([tradeData, accountData, profile]) => {
        if (cancelled) return;
        setTrades(tradeData);
        setAccounts(accountData);
        if (profile?.timezone) setTimeZone(profile.timezone);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your dashboard",
            description: "Refresh the page to try again.",
            variant: "error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const filtered = useMemo(
    () => filterTrades(trades, accountFilter, range),
    [trades, accountFilter, range],
  );
  // The calendar scopes itself by month, so only the account filter applies.
  const accountScoped = useMemo(
    () => filterTrades(trades, accountFilter, "all"),
    [trades, accountFilter],
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const equity = useMemo(() => equityPoints(filtered), [filtered]);
  const months = useMemo(() => monthlyPnl(filtered), [filtered]);
  const currency = useMemo(() => commonCurrency(filtered), [filtered]);
  const calendarCurrency = useMemo(
    () => commonCurrency(accountScoped),
    [accountScoped],
  );

  if (!loaded) {
    return (
      <div className="space-y-6" aria-hidden="true">
        <div className="h-24 animate-pulse rounded-lg border border-edge bg-surface" />
        <div className="h-96 animate-pulse rounded-lg border border-edge bg-surface" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <EmptyState
        title="No trades to analyze yet"
        description="Log your first trade and this dashboard fills in — P&L, win rate, profit factor, your equity curve, and a calendar of your trading days."
        action={
          <Link
            href="/trades"
            className="inline-flex h-11 select-none items-center justify-center gap-2 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-fg transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Log a trade
          </Link>
        }
      />
    );
  }

  const filterChip = (active: boolean): string =>
    `h-8 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ease-out ${
      active
        ? "bg-selected text-ink"
        : "text-muted hover:bg-hover hover:text-ink"
    }`;

  let profitFactorValue = "—";
  if (stats.profitFactor === Infinity) profitFactorValue = "∞";
  else if (stats.profitFactor != null)
    profitFactorValue = stats.profitFactor.toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Time range"
          className="flex rounded-md border border-edge bg-surface p-0.5"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={range === r.key}
              onClick={() => setRange(r.key)}
              className={filterChip(range === r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <FilterSelect
            aria-label="Filter by account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-edge bg-surface px-5 py-4">
        <div className="flex items-baseline gap-3">
          <p className="text-[13px] font-medium text-faint">Total profit</p>
          <p
            className={`text-[28px] font-semibold tracking-[-0.02em] ${
              stats.totalProfit > 0
                ? "text-positive"
                : stats.totalProfit < 0
                  ? "text-negative"
                  : "text-ink"
            }`}
          >
            {stats.totalProfit > 0 ? "+" : ""}
            {money(stats.totalProfit, currency)}
          </p>
        </div>
        <p className="text-[13px] text-muted">
          {stats.closedCount} closed{" "}
          {stats.closedCount === 1 ? "trade" : "trades"}
          {currency === null && stats.closedCount > 0 && (
            <span className="text-faint">
              {" "}
              · mixed currencies, shown unconverted
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Total trades"
          value={String(stats.totalTrades)}
          detail={`${stats.closedCount} closed`}
        />
        <StatTile
          label="Win rate"
          value={stats.winRate != null ? `${stats.winRate}%` : "—"}
          detail={
            stats.closedCount > 0
              ? `${stats.wins}W · ${stats.losses}L`
              : undefined
          }
        />
        <StatTile label="Profit factor" value={profitFactorValue} />
        <StatTile
          label="Average RR"
          value={stats.avgRR != null ? `${stats.avgRR.toFixed(2)}R` : "—"}
        />
        <StatTile
          label="Best setup"
          value={stats.bestSetup?.name ?? "—"}
          detail={
            stats.bestSetup ? money(stats.bestSetup.pnl, currency) : undefined
          }
        />
        <StatTile
          label="Best session"
          value={stats.bestSession?.name ?? "—"}
          detail={
            stats.bestSession
              ? money(stats.bestSession.pnl, currency)
              : undefined
          }
        />
      </div>

      <PnlCalendar
        trades={accountScoped}
        timeZone={timeZone}
        currency={calendarCurrency}
      />

      {equity.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Equity curve">
            <EquityCurve points={equity} height={180} />
          </Card>
          <Card title="Monthly performance">
            <MonthlyBars bars={months} height={180} />
          </Card>
        </div>
      ) : (
        <Card>
          <p className="py-8 text-center text-[14px] text-muted">
            Charts appear once a trade in this range is closed with a P/L.
          </p>
        </Card>
      )}
    </div>
  );
}

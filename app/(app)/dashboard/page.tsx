"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { getProfile } from "@/src/lib/profile";
import { useProfile } from "@/src/lib/profile-context";
import { listAccounts, type Account } from "@/src/lib/accounts";
import { listTrades, type Trade } from "@/src/lib/trades";
import {
  commonCurrency,
  computeStats,
  equityPoints,
  filterTrades,
  monthlyPnl,
} from "@/src/lib/stats";
import { formatMoney } from "@/src/lib/format";
import { signedCompact } from "@/src/components/charts/chart-utils";
import { EquityCurve } from "@/src/components/charts/equity-curve";
import { MonthlyBars } from "@/src/components/charts/monthly-bars";
import { AccountSelector } from "@/src/components/dashboard/account-selector";
import { AccountSnapshot } from "@/src/components/dashboard/account-snapshot";
import { PnlCalendar } from "@/src/components/dashboard/pnl-calendar";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
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
    <div className="min-w-0 rounded-lg border border-edge bg-surface p-4">
      <p className="truncate text-[12px] font-medium text-faint">{label}</p>
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
  const { profile } = useProfile();
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [loaded, setLoaded] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");

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

  // Dashboard shows all-time data, scoped only by the selected account.
  const scoped = useMemo(
    () => filterTrades(trades, accountFilter, "all"),
    [trades, accountFilter],
  );
  const stats = useMemo(() => computeStats(scoped), [scoped]);
  const equity = useMemo(() => equityPoints(scoped), [scoped]);
  const months = useMemo(() => monthlyPnl(scoped), [scoped]);
  const currency = useMemo(() => commonCurrency(scoped), [scoped]);

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

  let profitFactorValue = "—";
  if (stats.profitFactor === Infinity) profitFactorValue = "∞";
  else if (stats.profitFactor != null)
    profitFactorValue = stats.profitFactor.toFixed(2);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.display_name?.trim();

  const profitTone =
    stats.totalProfit > 0
      ? "text-positive"
      : stats.totalProfit < 0
        ? "text-negative"
        : "text-ink";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] text-muted">
          {greeting}
          {firstName && (
            <>
              , <span className="font-medium text-ink">{firstName}</span>!
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/accounts?new=1"
            className="inline-flex h-11 flex-1 select-none items-center justify-center gap-2 rounded-md border border-edge-strong px-4 text-[14px] font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-raised active:scale-[0.98] sm:flex-none"
          >
            <Plus className="-ml-0.5 size-4" aria-hidden="true" />
            Add account
          </Link>
          <Link
            href="/trades?new=1"
            className="inline-flex h-11 flex-1 select-none items-center justify-center gap-2 rounded-md bg-primary px-4 text-[14px] font-medium text-primary-fg transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98] sm:flex-none"
          >
            <Plus className="-ml-0.5 size-4" aria-hidden="true" />
            Log trade
          </Link>
        </div>
      </div>

      {accounts.length > 1 ? (
        <AccountSelector
          accounts={accounts}
          trades={trades}
          selected={accountFilter}
          onSelect={setAccountFilter}
        />
      ) : accounts.length === 1 ? (
        <AccountSnapshot account={accounts[0]} />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 flex min-w-0 flex-col justify-center rounded-lg border border-edge bg-surface p-4">
          <p className="text-[12px] font-medium text-faint">Total profit</p>
          <p
            className={`mt-1.5 truncate text-3xl font-semibold leading-none tracking-[-0.02em] ${profitTone}`}
          >
            {money(stats.totalProfit, currency)}
          </p>
          <p className="mt-2 text-[12px] text-faint">
            {stats.closedCount} closed{" "}
            {stats.closedCount === 1 ? "trade" : "trades"}
            {currency === null && stats.closedCount > 0 && (
              <span> · mixed currencies</span>
            )}
          </p>
        </div>
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

      <PnlCalendar trades={scoped} timeZone={timeZone} currency={currency} />

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
            Charts appear once a trade is closed with a P/L.
          </p>
        </Card>
      )}
    </div>
  );
}

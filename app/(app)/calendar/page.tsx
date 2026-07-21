"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { getProfile } from "@/src/lib/profile";
import { listTrades, type Trade } from "@/src/lib/trades";
import {
  dayKeyInZone,
  groupTradesByDay,
  monthGrid,
  tradeTime,
  type DaySummary,
} from "@/src/lib/calendar";
import { commonCurrency } from "@/src/lib/stats";
import { formatMoney } from "@/src/lib/format";
import { signedCompact } from "@/src/components/charts/chart-utils";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { useToast } from "@/src/components/ui/toast";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [loaded, setLoaded] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listTrades(), getProfile(user.id)])
      .then(([tradeData, profile]) => {
        if (cancelled) return;
        setTrades(tradeData);
        if (profile?.timezone) setTimeZone(profile.timezone);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load the calendar",
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

  const byDay = useMemo(
    () => groupTradesByDay(trades, timeZone),
    [trades, timeZone],
  );
  const todayKey = useMemo(
    () => dayKeyInZone(new Date(), timeZone),
    [timeZone],
  );
  const cells = useMemo(
    () => monthGrid(year, month, todayKey),
    [year, month, todayKey],
  );
  const currency = useMemo(() => commonCurrency(trades), [trades]);

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    let pnl = 0;
    let count = 0;
    let winDays = 0;
    let lossDays = 0;
    for (const [key, day] of byDay) {
      if (!key.startsWith(prefix)) continue;
      pnl += day.pnl;
      count += day.count;
      if (day.pnl > 0) winDays += 1;
      else if (day.pnl < 0) lossDays += 1;
    }
    return { pnl: Math.round(pnl * 100) / 100, count, winDays, lossDays };
  }, [byDay, year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function money(value: number): string {
    return currency ? formatMoney(value, currency) : signedCompact(value);
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  const selected: DaySummary | null =
    selectedDay != null ? (byDay.get(selectedDay) ?? null) : null;

  const selectedLabel =
    selectedDay != null
      ? new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date(`${selectedDay}T12:00:00`))
      : "";

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  if (!loaded) {
    return (
      <div
        className="h-96 animate-pulse rounded-lg border border-edge bg-surface"
        aria-hidden="true"
      />
    );
  }

  if (byDay.size === 0) {
    return (
      <EmptyState
        title="Your trading calendar"
        description="Once trades are closed with a P/L, each day lights up green or red — trade counts, daily totals, and your rhythm at a glance."
        action={
          <Link
            href="/trades"
            className="inline-flex h-11 select-none items-center justify-center rounded-md bg-primary px-4 text-[15px] font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Go to Trades
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex size-9 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <h2 className="min-w-44 text-center text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex size-9 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          {(year !== now.getFullYear() || month !== now.getMonth()) && (
            <button
              type="button"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
              className="ml-1 h-8 rounded-md px-3 text-[13px] font-medium text-accent transition-colors duration-150 ease-out hover:bg-white/5"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-5 text-[13px]">
          <span
            className={`tabular font-semibold ${
              monthStats.pnl > 0
                ? "text-positive"
                : monthStats.pnl < 0
                  ? "text-negative"
                  : "text-ink"
            }`}
          >
            {monthStats.pnl > 0 ? "+" : ""}
            {money(monthStats.pnl)}
          </span>
          <span className="text-muted">
            {monthStats.count} {monthStats.count === 1 ? "trade" : "trades"}
          </span>
          <span className="text-muted">
            <span className="text-positive">{monthStats.winDays}</span>
            {" / "}
            <span className="text-negative">{monthStats.lossDays}</span>
            <span className="ml-1 text-faint">days</span>
          </span>
        </div>
      </div>

      <div
        key={`${year}-${month}`}
        className="animate-fade overflow-hidden rounded-lg border border-edge bg-surface"
      >
        <div className="grid grid-cols-7 border-b border-edge">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-medium text-faint"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const day = byDay.get(cell.key);
            const hasTrades = day != null && cell.inMonth;
            const positive = day != null && day.pnl > 0;
            const negative = day != null && day.pnl < 0;

            return (
              <button
                key={cell.key}
                type="button"
                disabled={!hasTrades}
                onClick={() => setSelectedDay(cell.key)}
                aria-label={
                  hasTrades
                    ? `${cell.key}: ${day.count} trades, ${signedCompact(
                        day.pnl,
                      )}`
                    : undefined
                }
                className={`relative flex min-h-16 flex-col items-start gap-1 border-b border-r border-edge p-1.5 text-left transition-colors duration-150 ease-out [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 sm:min-h-20 sm:p-2 ${
                  i >= 35 && !cells.slice(35).some((c) => c.inMonth)
                    ? "hidden"
                    : ""
                } ${
                  hasTrades
                    ? positive
                      ? "bg-positive/10 hover:bg-positive/15"
                      : negative
                        ? "bg-negative/10 hover:bg-negative/15"
                        : "bg-white/[0.03] hover:bg-white/[0.06]"
                    : ""
                } ${!hasTrades ? "cursor-default" : "active:scale-[0.99]"}`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[11px] ${
                    cell.isToday
                      ? "bg-accent font-semibold text-canvas"
                      : cell.inMonth
                        ? "text-muted"
                        : "text-faint/50"
                  }`}
                >
                  {cell.dayOfMonth}
                </span>
                {hasTrades && (
                  <span className="min-w-0">
                    <span
                      className={`tabular block truncate text-[11px] font-semibold sm:text-[12px] ${
                        positive
                          ? "text-positive"
                          : negative
                            ? "text-negative"
                            : "text-muted"
                      }`}
                    >
                      {signedCompact(day.pnl)}
                    </span>
                    <span className="block text-[10px] text-faint">
                      {day.count} {day.count === 1 ? "trade" : "trades"}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedLabel}
        description={
          selected
            ? `${selected.count} ${
                selected.count === 1 ? "trade" : "trades"
              } · ${selected.wins}W / ${selected.losses}L`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-1">
            <p
              className={`tabular mb-4 text-2xl font-semibold tracking-[-0.01em] ${
                selected.pnl > 0
                  ? "text-positive"
                  : selected.pnl < 0
                    ? "text-negative"
                    : "text-ink"
              }`}
            >
              {selected.pnl > 0 ? "+" : ""}
              {money(selected.pnl)}
            </p>
            {selected.trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-out hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {trade.direction === "Buy" ? (
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-positive"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowDownRight
                      className="size-3.5 shrink-0 text-negative"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate text-[14px] font-medium text-ink">
                    {trade.pair}
                  </span>
                  <span className="text-[12px] text-faint">
                    {timeFmt.format(tradeTime(trade))}
                  </span>
                </span>
                <span
                  className={`tabular text-[14px] font-medium ${
                    (trade.profit_loss ?? 0) > 0
                      ? "text-positive"
                      : (trade.profit_loss ?? 0) < 0
                        ? "text-negative"
                        : "text-muted"
                  }`}
                >
                  {signedCompact(trade.profit_loss ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Trade } from "@/src/lib/trades";
import {
  dayKeyInZone,
  groupTradesByDay,
  monthGrid,
  tradeTime,
  type CalendarCell,
  type DaySummary,
} from "@/src/lib/calendar";
import { formatMoney, formatSignedMoney } from "@/src/lib/format";
import { signedCompact } from "@/src/components/charts/chart-utils";
import { Modal } from "@/src/components/ui/modal";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function PnlCalendar({
  trades,
  timeZone,
  currency,
}: {
  trades: Trade[];
  timeZone: string;
  currency: string | null;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(
    () => groupTradesByDay(trades, timeZone),
    [trades, timeZone],
  );
  const todayKey = useMemo(
    () => dayKeyInZone(new Date(), timeZone),
    [timeZone],
  );

  // 42-cell Monday-first grid, chunked into weeks that touch this month.
  const weeks = useMemo(() => {
    const cells = monthGrid(year, month, todayKey);
    const chunks: CalendarCell[][] = [];
    for (let i = 0; i < 42; i += 7) chunks.push(cells.slice(i, i + 7));
    return chunks.filter((week) => week.some((c) => c.inMonth));
  }, [year, month, todayKey]);

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    let pnl = 0;
    let count = 0;
    for (const [key, day] of byDay) {
      if (!key.startsWith(prefix)) continue;
      pnl += day.pnl;
      count += day.count;
    }
    return { pnl: Math.round(pnl * 100) / 100, count };
  }, [byDay, year, month]);

  /** Weekly totals over in-month days — weekends fold in here. */
  function weekSummary(week: CalendarCell[]) {
    let pnl = 0;
    let count = 0;
    for (const cell of week) {
      if (!cell.inMonth) continue;
      const day = byDay.get(cell.key);
      if (!day) continue;
      pnl += day.pnl;
      count += day.count;
    }
    return { pnl: Math.round(pnl * 100) / 100, count };
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function money(value: number): string {
    return currency ? formatMoney(value, currency) : signedCompact(value);
  }

  /** Cell/summary figures: "$" with decimals, compact only when long. */
  function cellMoney(value: number): string {
    return currency
      ? formatSignedMoney(value, currency)
      : signedCompact(value);
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

  const pnlTone = (value: number) =>
    value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-muted";

  return (
    <section className="rounded-lg border border-edge bg-surface p-3 sm:p-4">
      <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <h3 className="min-w-32 text-center text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {monthLabel}
          </h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
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
              className="ml-1 h-8 shrink-0 rounded-md px-3 text-[13px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-hover"
            >
              Today
            </button>
          )}
        </div>

        <p className="flex items-center justify-center gap-5 text-[13px] sm:justify-end">
          <span className="text-muted">
            P/L:{" "}
            <span
              className={`tabular font-semibold ${pnlTone(monthStats.pnl)}`}
            >
              {cellMoney(monthStats.pnl)}
            </span>
          </span>
          <span className="text-muted">
            Trades:{" "}
            <span className="tabular font-semibold text-ink">
              {monthStats.count}
            </span>
          </span>
        </p>
      </header>

      <div key={`${year}-${month}`} className="animate-fade">
        <div className="mb-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-medium text-faint"
            >
              {label}
            </div>
          ))}
          <div className="hidden py-1 text-center text-[11px] font-medium text-faint sm:block">
            Summary
          </div>
        </div>

        <div className="space-y-1.5">
          {weeks.map((week, w) => {
            const summary = weekSummary(week);
            return (
              <div key={w} className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                {week.slice(0, 5).map((cell) => {
                  const day = cell.inMonth ? byDay.get(cell.key) : undefined;
                  const hasTrades = day != null;
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
                          ? `${cell.key}: ${day.count} trades, ${cellMoney(
                              day.pnl,
                            )}`
                          : undefined
                      }
                      className={`relative flex aspect-square flex-col rounded-md p-2 text-left transition-colors duration-150 ease-out sm:aspect-auto sm:min-h-27 ${
                        cell.isToday
                          ? "ring-1 ring-inset ring-ink/60"
                          : ""
                      } ${
                        !cell.inMonth
                          ? "bg-wash-strong"
                          : positive
                            ? "bg-positive/12 hover:bg-positive/18"
                            : negative
                              ? "bg-negative/12 hover:bg-negative/18"
                              : hasTrades
                                ? "bg-hover hover:bg-selected"
                                : "bg-wash"
                      } ${hasTrades ? "active:scale-[0.99]" : "cursor-default"}`}
                    >
                      <span
                        className={`flex size-5 items-center justify-center text-[12px] ${
                          cell.isToday
                            ? "font-semibold text-ink"
                            : cell.inMonth
                              ? "text-ink"
                              : "text-faint"
                        }`}
                      >
                        {cell.dayOfMonth}
                      </span>
                      {hasTrades && (
                        <span className="hidden flex-1 flex-col items-center justify-center gap-0.5 pb-1 text-center sm:flex">
                          <span
                            className={`tabular text-[13px] font-semibold ${pnlTone(
                              day.pnl,
                            )}`}
                          >
                            {day.count}
                          </span>
                          <span
                            className={`tabular max-w-full truncate text-[13px] font-semibold sm:text-[14px] ${pnlTone(
                              day.pnl,
                            )}`}
                          >
                            {cellMoney(day.pnl)}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="hidden min-h-20 flex-col items-center justify-center gap-0.5 rounded-md bg-wash p-2 text-center sm:flex sm:min-h-27">
                  {summary.count > 0 && (
                    <>
                      <span className="text-[13px] text-muted">
                        {summary.count}{" "}
                        {summary.count === 1 ? "trade" : "trades"}
                      </span>
                      <span
                        className={`tabular max-w-full truncate text-[13px] font-semibold sm:text-[14px] ${pnlTone(
                          summary.pnl,
                        )}`}
                      >
                        {cellMoney(summary.pnl)}
                      </span>
                    </>
                  )}
                </div>
              </div>
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
              {money(selected.pnl)}
            </p>
            {selected.trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-out hover:bg-hover"
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
                  {cellMoney(trade.profit_loss ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}

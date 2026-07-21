import type { Trade } from "./trades";

export type DaySummary = {
  pnl: number;
  count: number;
  wins: number;
  losses: number;
  trades: Trade[];
};

/** The instant a trade "counts": exit for closed trades, entry otherwise. */
export function tradeTime(trade: Trade): Date {
  return new Date(trade.exit_time ?? trade.entry_time);
}

/** YYYY-MM-DD of an instant in a specific IANA timezone. */
export function dayKeyInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function groupTradesByDay(
  trades: Trade[],
  timeZone: string,
): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const trade of trades) {
    if (trade.status !== "Closed" || trade.profit_loss == null) continue;
    const key = dayKeyInZone(tradeTime(trade), timeZone);
    const day = map.get(key) ?? {
      pnl: 0,
      count: 0,
      wins: 0,
      losses: 0,
      trades: [],
    };
    day.pnl += trade.profit_loss;
    day.count += 1;
    if (trade.profit_loss > 0) day.wins += 1;
    else if (trade.profit_loss < 0) day.losses += 1;
    day.trades.push(trade);
    map.set(key, day);
  }
  for (const day of map.values()) {
    day.pnl = Math.round(day.pnl * 100) / 100;
    day.trades.sort(
      (a, b) => tradeTime(a).getTime() - tradeTime(b).getTime(),
    );
  }
  return map;
}

export type CalendarCell = {
  key: string; // YYYY-MM-DD
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
};

/** Monday-first 6×7 grid for a given month. */
export function monthGrid(
  year: number,
  month: number,
  todayKey: string,
): CalendarCell[] {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({
      key,
      dayOfMonth: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: key === todayKey,
    });
  }
  return cells;
}

import type { Trade } from "./trades";

export type RangeKey = "30d" | "90d" | "ytd" | "all";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.getTime() - 30 * 86400_000);
    case "90d":
      return new Date(now.getTime() - 90 * 86400_000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

/** The instant a trade "counts": exit for closed trades, entry otherwise. */
function tradeTime(trade: Trade): Date {
  return new Date(trade.exit_time ?? trade.entry_time);
}

export function filterTrades(
  trades: Trade[],
  accountId: string,
  range: RangeKey,
): Trade[] {
  const start = rangeStart(range);
  return trades.filter(
    (t) =>
      (accountId === "all" || t.account_id === accountId) &&
      (start === null || tradeTime(t) >= start),
  );
}

export function closedWithPnl(trades: Trade[]): Trade[] {
  return trades
    .filter((t) => t.status === "Closed" && t.profit_loss != null)
    .sort((a, b) => tradeTime(a).getTime() - tradeTime(b).getTime());
}

/** Single currency across the filtered set, or null when mixed. */
export function commonCurrency(trades: Trade[]): string | null {
  const currencies = new Set(
    trades.map((t) => t.accounts?.currency ?? "USD"),
  );
  return currencies.size === 1 ? [...currencies][0] : null;
}

export type Stats = {
  totalTrades: number;
  closedCount: number;
  winRate: number | null;
  profitFactor: number | null; // Infinity = wins but zero losses
  avgRR: number | null;
  totalProfit: number;
  bestSetup: { name: string; pnl: number } | null;
  bestSession: { name: string; pnl: number } | null;
  wins: number;
  losses: number;
  breakeven: number;
};

export function computeStats(trades: Trade[]): Stats {
  const closed = closedWithPnl(trades);
  const wins = closed.filter((t) => (t.profit_loss ?? 0) > 0);
  const losses = closed.filter((t) => (t.profit_loss ?? 0) < 0);
  const breakeven = closed.length - wins.length - losses.length;

  const grossProfit = wins.reduce((s, t) => s + (t.profit_loss ?? 0), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + (t.profit_loss ?? 0), 0),
  );

  const rrValues = closed
    .map((t) => t.rr)
    .filter((rr): rr is number => rr != null);

  const bySetup = new Map<string, number>();
  const bySession = new Map<string, number>();
  for (const t of closed) {
    if (t.setups?.name) {
      bySetup.set(
        t.setups.name,
        (bySetup.get(t.setups.name) ?? 0) + (t.profit_loss ?? 0),
      );
    }
    if (t.session) {
      bySession.set(
        t.session,
        (bySession.get(t.session) ?? 0) + (t.profit_loss ?? 0),
      );
    }
  }
  const best = (m: Map<string, number>) => {
    let top: { name: string; pnl: number } | null = null;
    for (const [name, pnl] of m) {
      if (top === null || pnl > top.pnl) top = { name, pnl };
    }
    return top;
  };

  return {
    totalTrades: trades.length,
    closedCount: closed.length,
    winRate:
      closed.length > 0
        ? Math.round((wins.length / closed.length) * 100)
        : null,
    profitFactor:
      grossLoss > 0
        ? Math.round((grossProfit / grossLoss) * 100) / 100
        : grossProfit > 0
          ? Infinity
          : null,
    avgRR:
      rrValues.length > 0
        ? Math.round(
            (rrValues.reduce((s, v) => s + v, 0) / rrValues.length) * 100,
          ) / 100
        : null,
    totalProfit: closed.reduce((s, t) => s + (t.profit_loss ?? 0), 0),
    bestSetup: best(bySetup),
    bestSession: best(bySession),
    wins: wins.length,
    losses: losses.length,
    breakeven,
  };
}

export type EquityPoint = {
  date: Date;
  equity: number;
  pnl: number;
  pair: string;
};

export function equityPoints(trades: Trade[]): EquityPoint[] {
  let running = 0;
  return closedWithPnl(trades).map((t) => {
    running += t.profit_loss ?? 0;
    return {
      date: tradeTime(t),
      equity: Math.round(running * 100) / 100,
      pnl: t.profit_loss ?? 0,
      pair: t.pair,
    };
  });
}

export type MonthBar = { label: string; value: number };

export function monthlyPnl(trades: Trade[]): MonthBar[] {
  const closed = closedWithPnl(trades);
  if (closed.length === 0) return [];

  const byMonth = new Map<string, number>();
  for (const t of closed) {
    const d = tradeTime(t);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + (t.profit_loss ?? 0));
  }

  const keys = [...byMonth.keys()].sort();
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  });
  return keys.slice(-12).map((key) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: fmt.format(new Date(year, month, 1)),
      value: Math.round((byMonth.get(key) ?? 0) * 100) / 100,
    };
  });
}

export type SetupRow = { name: string; value: number; count: number };

export function setupPnl(trades: Trade[]): SetupRow[] {
  const closed = closedWithPnl(trades);
  const map = new Map<string, { value: number; count: number }>();
  for (const t of closed) {
    const name = t.setups?.name ?? "No setup";
    const entry = map.get(name) ?? { value: 0, count: 0 };
    entry.value += t.profit_loss ?? 0;
    entry.count += 1;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([name, { value, count }]) => ({
      name,
      value: Math.round(value * 100) / 100,
      count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

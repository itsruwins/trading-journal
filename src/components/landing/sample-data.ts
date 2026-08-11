import type { Account } from "@/src/lib/accounts";
import type { EquityPoint, MonthBar } from "@/src/lib/stats";
import { formatMoney, formatSignedMoney } from "@/src/lib/format";

/* Sample figures for the landing page's product render.

   One hand-written series of closed-trade P&L drives everything on the page —
   the equity curve, every stat tile, the monthly bars, the setup and session
   breakdowns. The arithmetic is the real arithmetic (the same definitions as
   src/lib/stats.ts), so the numbers agree with each other the way they would
   in the app. A mock whose win rate contradicts its own curve is the kind of
   detail that quietly tells a visitor the product isn't real.

   The shapes exported here are the app's own types, so the landing page can
   feed the actual dashboard components rather than an imitation of them.

   Every surface that renders these is labelled "Sample data". */

/* Deliberately contains a losing month. A sample curve that only ever goes up
   is the thing that makes a trading product look like it's selling something. */
const PNL = [
  182, -96, 240, 118, -142, 310, 86, -61, 196, 424, -212, 151, 92, -274, 158,
  -341, -181, 224, 205, -97, 382, 163, -244, 291, 176, 94, -131, 412, 221, -86,
  339, 184, 262, -112, 396,
];

const PAIRS = ["GBPUSD", "EURUSD", "XAUUSD", "USDJPY", "AUDUSD"];

export const CURRENCY = "USD";

export const CLOSED = PNL.length;

const wins = PNL.filter((v) => v > 0);
const losses = PNL.filter((v) => v < 0);
const grossProfit = wins.reduce((s, v) => s + v, 0);
const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));

export const WINS = wins.length;
export const LOSSES = losses.length;
export const WIN_RATE = Math.round((WINS / CLOSED) * 100);
export const PROFIT_FACTOR = Math.round((grossProfit / grossLoss) * 100) / 100;
export const AVG_R = 1.84;

/* Fixed calendar dates rather than offsets from today: `/` is statically
   prerendered, so anything derived from `new Date()` would bake the build date
   into the HTML and then disagree with the browser on hydration. */
const START = new Date(2026, 2, 3); // 3 March 2026

export const EQUITY_POINTS: EquityPoint[] = (() => {
  let running = 0;
  return PNL.map((pnl, i) => {
    running = Math.round((running + pnl) * 100) / 100;
    const date = new Date(START);
    date.setDate(START.getDate() + i * 5);
    return { date, equity: running, pnl, pair: PAIRS[i % PAIRS.length] };
  });
})();

export const NET = EQUITY_POINTS[EQUITY_POINTS.length - 1].equity;

/** Six months of the same series, in the shape MonthlyBars expects. */
export const MONTH_BARS: MonthBar[] = (() => {
  const labels = ["Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26"];
  const size = Math.ceil(PNL.length / labels.length);
  return labels.map((label, i) => ({
    label,
    value: Math.round(
      PNL.slice(i * size, i * size + size).reduce((s, v) => s + v, 0),
    ),
  }));
})();

/** Feeds the real AccountSnapshot at the top of the mock. */
export const SAMPLE_ACCOUNT: Account = {
  id: "sample",
  user_id: "sample",
  account_name: "EQUITY EDGE 5K FUNDED",
  broker: "EQUITY EDGE",
  account_type: "prop",
  initial_balance: 5000,
  current_balance: Math.round((5000 + NET) * 100) / 100,
  currency: CURRENCY,
  is_active: true,
  created_at: "2026-03-01T00:00:00.000Z",
  updated_at: null,
};

export function money(value: number): string {
  return formatMoney(value, CURRENCY);
}

export function signedMoney(value: number): string {
  return formatSignedMoney(value, CURRENCY);
}

export const SETUPS: { name: string; value: number; count: number }[] = [
  { name: "London breakout", value: 2140, count: 14 },
  { name: "NY reversal", value: 1265, count: 9 },
  { name: "Asian range fade", value: 430, count: 6 },
  { name: "News fade", value: -385, count: 6 },
];

export const SESSIONS: { name: string; value: number; count: number }[] = [
  { name: "London", value: 2240, count: 18 },
  { name: "New York", value: 1420, count: 12 },
  { name: "Asia", value: -210, count: 5 },
];

export const BEST_SETUP = SETUPS[0];
export const BEST_SESSION = SESSIONS[0];

/* A month of trading days, Mon–Fri over four weeks. `null` is a day with
   nothing logged; the rest carry a trade count as well as a P&L, because the
   dashboard calendar shows both in every cell. */
export type CalendarDay = { pnl: number; count: number } | null;

export const CALENDAR: CalendarDay[] = [
  { pnl: 240, count: 2 }, { pnl: -96, count: 1 }, { pnl: 118, count: 1 }, null, { pnl: 310, count: 3 },
  { pnl: 86, count: 1 }, { pnl: -61, count: 2 }, { pnl: 196, count: 2 }, { pnl: 424, count: 3 }, { pnl: -212, count: 2 },
  { pnl: 151, count: 1 }, null, { pnl: -74, count: 1 }, { pnl: 258, count: 2 }, { pnl: 341, count: 3 },
  { pnl: -181, count: 2 }, { pnl: 124, count: 1 }, { pnl: 205, count: 2 }, null, { pnl: 382, count: 3 },
];

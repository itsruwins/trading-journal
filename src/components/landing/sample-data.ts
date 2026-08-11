import { formatMoney, formatSignedMoney } from "@/src/lib/format";

/* Sample figures for the landing page's product render.

   One hand-written series of closed-trade P&L drives everything on the page —
   the equity curve, the four stat tiles, the monthly bars, the setup rows. The
   arithmetic is the real arithmetic (the same definitions as src/lib/stats.ts),
   so the numbers agree with each other the way they would in the app. A mock
   whose win rate contradicts its own curve is the kind of detail that quietly
   tells a visitor the product isn't real.

   Every surface that renders these is labelled "Sample data". */

/* Deliberately contains a losing month. A sample curve that only ever goes up
   is the thing that makes a trading product look like it's selling something. */
const PNL = [
  182, -96, 240, 118, -142, 310, 86, -61, 196, 424, -212, 151, 92, -274, 158,
  -341, -181, 224, 205, -97, 382, 163, -244, 291, 176, 94, -131, 412, 221, -86,
  339, 184, 262, -112, 396,
];

export const CURRENCY = "USD";

/** Running equity, in the same shape stats.equityPoints() produces. */
export const EQUITY: number[] = PNL.reduce<number[]>((acc, pnl) => {
  acc.push(Math.round(((acc[acc.length - 1] ?? 0) + pnl) * 100) / 100);
  return acc;
}, []);

const wins = PNL.filter((v) => v > 0);
const losses = PNL.filter((v) => v < 0);
const grossProfit = wins.reduce((s, v) => s + v, 0);
const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));

export const NET = EQUITY[EQUITY.length - 1];
export const WIN_RATE = Math.round((wins.length / PNL.length) * 100);
export const PROFIT_FACTOR = Math.round((grossProfit / grossLoss) * 100) / 100;
export const CLOSED = PNL.length;
export const AVG_R = 1.84;

export function money(value: number): string {
  return formatMoney(value, CURRENCY);
}

export function signedMoney(value: number): string {
  return formatSignedMoney(value, CURRENCY);
}

/** Six months of the same series, chunked so the bars sum to NET. */
export const MONTHS: { label: string; value: number }[] = (() => {
  const labels = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const size = Math.ceil(PNL.length / labels.length);
  return labels.map((label, i) => ({
    label,
    value: Math.round(
      PNL.slice(i * size, i * size + size).reduce((s, v) => s + v, 0),
    ),
  }));
})();

export const SETUPS: { name: string; value: number; count: number }[] = [
  { name: "London breakout", value: 2140, count: 14 },
  { name: "NY reversal", value: 1265, count: 9 },
  { name: "Asian range fade", value: 430, count: 6 },
  { name: "News fade", value: -385, count: 6 },
];

/* A month of trading days: Mon–Fri columns, four weeks. `null` is a day with
   nothing logged, which the calendar renders as an empty well. */
export const CALENDAR: (number | null)[] = [
  240, -96, 118, null, 310,
  86, -61, 196, 424, -212,
  151, null, -74, 258, 341,
  -181, 124, 205, null, 382,
];

/** Recent trades for the blotter strip under the curve. */
export const BLOTTER: {
  pair: string;
  direction: "Buy" | "Sell";
  setup: string;
  session: string;
  rr: number;
  pnl: number;
}[] = [
  {
    pair: "GBPUSD",
    direction: "Buy",
    setup: "London breakout",
    session: "London",
    rr: 2.4,
    pnl: 396,
  },
  {
    pair: "XAUUSD",
    direction: "Sell",
    setup: "News fade",
    session: "New York",
    rr: -1,
    pnl: -112,
  },
  {
    pair: "EURUSD",
    direction: "Buy",
    setup: "NY reversal",
    session: "New York",
    rr: 1.8,
    pnl: 262,
  },
];

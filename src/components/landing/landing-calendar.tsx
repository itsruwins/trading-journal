import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { CALENDAR, signedMoney, type CalendarDay } from "./sample-data";

/* A still of the dashboard's P&L calendar.

   Same markup, same tints, same six-column Mon–Fri-plus-Summary grid and the
   same count-over-P&L cell as src/components/dashboard/pnl-calendar.tsx — but
   static. PnlCalendar itself can't be dropped on this page for two reasons:

     1. It derives "today" and its opening month from `new Date()`. `/` is
        statically prerendered, so that would bake the build date into the HTML
        and then disagree with the browser on hydration.
     2. Its day modal links to /trades/[id]. A visitor with no account has no
        trades to open, so every link in it would be a dead end.

   The month is fixed at July 2026, whose weekdays really do fall on 6/13/20/27.

   If the real calendar's look changes, this needs the same edit. It is kept
   deliberately close to the original so that diff is obvious. */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTH_LABEL = "July 2026";

/** Monday dates of each week in July 2026. */
const WEEK_START = [6, 13, 20, 27];

const WEEKS: CalendarDay[][] = WEEK_START.map((_, w) =>
  CALENDAR.slice(w * 5, w * 5 + 5),
);

type Total = { pnl: number; count: number };

/* Explicitly typed: without the generic, reduce infers the accumulator from
   the array's own element type, which includes null. */
function total(days: CalendarDay[]): Total {
  return days.reduce<Total>(
    (acc, day) => ({
      pnl: acc.pnl + (day?.pnl ?? 0),
      count: acc.count + (day?.count ?? 0),
    }),
    { pnl: 0, count: 0 },
  );
}

const MONTH_TOTAL = total(CALENDAR);

function tone(value: number): string {
  return value > 0
    ? "text-positive"
    : value < 0
      ? "text-negative"
      : "text-muted";
}

export function LandingCalendar() {
  return (
    <section className="rounded-lg border border-edge bg-surface p-3 sm:p-4">
      <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div
          className="flex items-center justify-center gap-1 sm:justify-start"
          aria-hidden="true"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted">
            <ChevronLeft className="size-4" />
          </span>
          {/* A <p>, where the real calendar uses an <h3>: on this page the
              month label sits under the feature's own heading and isn't a
              section of the document. */}
          <p className="min-w-32 text-center text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {MONTH_LABEL}
          </p>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted">
            <ChevronRight className="size-4" />
          </span>
        </div>

        <p className="flex items-center justify-center gap-5 text-[13px] sm:justify-end">
          <span className="text-muted">
            P/L:{" "}
            <span className={cn("tabular font-semibold", tone(MONTH_TOTAL.pnl))}>
              {signedMoney(MONTH_TOTAL.pnl)}
            </span>
          </span>
          <span className="text-muted">
            Trades:{" "}
            <span className="tabular font-semibold text-ink">
              {MONTH_TOTAL.count}
            </span>
          </span>
        </p>
      </header>

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
        {WEEKS.map((week, w) => {
          const summary = total(week);

          return (
            <div key={w} className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {week.map((day, d) => {
                const positive = day != null && day.pnl > 0;
                const negative = day != null && day.pnl < 0;
                return (
                  <div
                    key={d}
                    className={cn(
                      "relative flex aspect-square flex-col rounded-md p-2 text-left sm:aspect-auto sm:min-h-27",
                      positive
                        ? "bg-positive/12"
                        : negative
                          ? "bg-negative/12"
                          : day
                            ? "bg-hover"
                            : "bg-wash",
                    )}
                  >
                    <span className="flex size-5 items-center justify-center text-[12px] text-ink">
                      {WEEK_START[w] + d}
                    </span>
                    {day && (
                      <span className="hidden w-full flex-1 flex-col items-center justify-center gap-0.5 pb-1 text-center sm:flex">
                        <span
                          className={cn(
                            "tabular text-[13px] font-semibold",
                            tone(day.pnl),
                          )}
                        >
                          {day.count}
                        </span>
                        <span
                          className={cn(
                            "tabular max-w-full truncate text-[13px] font-semibold sm:text-[14px]",
                            tone(day.pnl),
                          )}
                        >
                          {signedMoney(day.pnl)}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="hidden min-h-20 flex-col items-center justify-center gap-0.5 rounded-md bg-wash p-2 text-center sm:flex sm:min-h-27">
                <span className="text-[13px] text-muted">
                  {summary.count} {summary.count === 1 ? "trade" : "trades"}
                </span>
                <span
                  className={cn(
                    "tabular max-w-full truncate text-[13px] font-semibold sm:text-[14px]",
                    tone(summary.pnl),
                  )}
                >
                  {signedMoney(summary.pnl)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

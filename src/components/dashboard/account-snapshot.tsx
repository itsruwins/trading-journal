"use client";

import { useMemo } from "react";
import type { Account } from "@/src/lib/accounts";
import { formatMoney, formatSignedMoney } from "@/src/lib/format";

const TYPE_LABELS: Record<string, string> = {
  live: "Live",
  demo: "Demo",
  prop: "Prop firm",
  paper: "Paper",
};

/** A single account's snapshot for the dashboard (shown when there's one account). */
export function AccountSnapshot({ account }: { account: Account }) {
  const { pnl, pct } = useMemo(() => {
    const value =
      Math.round((account.current_balance - account.initial_balance) * 100) /
      100;
    return {
      pnl: value,
      pct:
        account.initial_balance !== 0
          ? Math.round((value / account.initial_balance) * 10000) / 100
          : null,
    };
  }, [account]);

  const tone =
    pnl > 0 ? "text-positive" : pnl < 0 ? "text-negative" : "text-muted";

  const meta = [
    account.broker,
    account.account_type
      ? (TYPE_LABELS[account.account_type] ?? account.account_type)
      : null,
    account.currency,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-edge bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">
          {account.account_name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tabular text-2xl font-semibold tracking-[-0.01em] text-ink">
            {formatMoney(account.current_balance, account.currency)}
          </span>
          <span className={`tabular text-[14px] font-medium ${tone}`}>
            {formatSignedMoney(pnl, account.currency)}
            {pct != null && (
              <>
                {" "}
                ({pct < 0 ? "−" : ""}
                {Math.abs(pct).toFixed(2)}%)
              </>
            )}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-edge pt-4 text-[13px] sm:items-end sm:border-none sm:pt-0">
        <p className="text-faint">
          Started{" "}
          <span className="tabular font-medium text-muted">
            {formatMoney(account.initial_balance, account.currency)}
          </span>
        </p>
        {meta && <p className="text-faint">{meta}</p>}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import type { Account } from "@/src/lib/accounts";
import type { Trade } from "@/src/lib/trades";
import { formatMoney, formatSignedMoney } from "@/src/lib/format";

type AccountStat = {
  id: string; // "all" or an account id
  name: string;
  currency: string | null; // null when balances span currencies
  balance: number | null;
  pnl: number | null;
  pct: number | null;
  trades: number;
  winRate: number | null;
};

function tradeStats(trades: Trade[]): { count: number; winRate: number | null } {
  const closed = trades.filter(
    (t) => t.status === "Closed" && t.profit_loss != null,
  );
  const wins = closed.filter((t) => (t.profit_loss ?? 0) > 0).length;
  return {
    count: trades.length,
    winRate: closed.length ? Math.round((wins / closed.length) * 100) : null,
  };
}

function tone(pnl: number | null): string {
  if (pnl == null || pnl === 0) return "text-muted";
  return pnl > 0 ? "text-positive" : "text-negative";
}

function AccountCard({
  card,
  selected,
  onSelect,
}: {
  card: AccountStat;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col rounded-md border p-4 text-left transition-colors duration-150 ease-out active:scale-[0.99] ${
        selected
          ? "border-ink/50 bg-selected"
          : "border-edge bg-canvas hover:border-edge-strong"
      }`}
    >
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">
        {card.name}
      </span>
      <span className="tabular mt-1.5 text-xl font-semibold tracking-[-0.01em] text-ink">
        {card.balance != null && card.currency
          ? formatMoney(card.balance, card.currency)
          : `${card.trades} ${card.trades === 1 ? "trade" : "trades"}`}
      </span>
      {card.pnl != null && card.currency && (
        <span className="mt-1 flex items-center justify-between gap-2 text-[13px]">
          <span className={`tabular font-medium ${tone(card.pnl)}`}>
            {formatSignedMoney(card.pnl, card.currency)}
          </span>
          {card.pct != null && (
            <span className={`tabular ${tone(card.pnl)}`}>
              {card.pct < 0 ? "−" : ""}
              {Math.abs(card.pct).toFixed(2)}%
            </span>
          )}
        </span>
      )}
      <span className="mt-3 flex items-center justify-between border-t border-edge pt-3 text-[12px] text-muted">
        <span>
          {card.trades} {card.trades === 1 ? "trade" : "trades"}
        </span>
        {card.winRate != null && (
          <span>
            <span className="font-medium text-ink">{card.winRate}%</span> win
          </span>
        )}
      </span>
    </button>
  );
}

export function AccountSelector({
  accounts,
  trades,
  selected,
  onSelect,
}: {
  accounts: Account[];
  trades: Trade[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const currency = useMemo(() => {
    const set = new Set(accounts.map((a) => a.currency));
    return set.size === 1 ? (accounts[0]?.currency ?? null) : null;
  }, [accounts]);

  const perAccount: AccountStat[] = useMemo(
    () =>
      accounts.map((a) => {
        const { count, winRate } = tradeStats(
          trades.filter((t) => t.account_id === a.id),
        );
        const pnl =
          Math.round((a.current_balance - a.initial_balance) * 100) / 100;
        const pct =
          a.initial_balance !== 0
            ? Math.round((pnl / a.initial_balance) * 10000) / 100
            : null;
        return {
          id: a.id,
          name: a.account_name,
          currency: a.currency,
          balance: a.current_balance,
          pnl,
          pct,
          trades: count,
          winRate,
        };
      }),
    [accounts, trades],
  );

  const allStat: AccountStat = useMemo(() => {
    const { count, winRate } = tradeStats(trades);
    const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
    const totalInitial = accounts.reduce((s, a) => s + a.initial_balance, 0);
    const pnl = Math.round((totalBalance - totalInitial) * 100) / 100;
    const pct =
      totalInitial !== 0 ? Math.round((pnl / totalInitial) * 10000) / 100 : null;
    return {
      id: "all",
      name: "All accounts",
      currency,
      balance: currency ? totalBalance : null,
      pnl: currency ? pnl : null,
      pct: currency ? pct : null,
      trades: count,
      winRate,
    };
  }, [accounts, trades, currency]);

  const cards = [allStat, ...perAccount];
  const selectedName =
    selected === "all"
      ? null
      : (perAccount.find((a) => a.id === selected)?.name ?? null);

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-hover"
      >
        <Wallet className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="text-[14px] font-medium text-ink">All accounts</span>
        {allStat.balance != null && allStat.currency && (
          <span className="hidden text-[13px] text-muted sm:inline">
            Balance{" "}
            <span className="tabular font-semibold text-ink">
              {formatMoney(allStat.balance, allStat.currency)}
            </span>
          </span>
        )}
        {allStat.pnl != null && allStat.currency && (
          <span className="text-[13px] text-muted">
            P/L{" "}
            <span className={`tabular font-semibold ${tone(allStat.pnl)}`}>
              {formatSignedMoney(allStat.pnl, allStat.currency)}
            </span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[13px] text-muted">
          {selectedName && (
            <span className="hidden max-w-32 truncate text-faint sm:inline">
              Viewing {selectedName}
            </span>
          )}
          <span className="hidden sm:inline">View accounts</span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ease-out ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div
          role="radiogroup"
          aria-label="Filter dashboard by account"
          className="animate-fade grid gap-3 border-t border-edge p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card) => (
            <AccountCard
              key={card.id}
              card={card}
              selected={selected === card.id}
              onSelect={() => onSelect(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

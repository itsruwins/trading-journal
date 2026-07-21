"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { listAccounts, adjustAccountBalance, type Account } from "@/src/lib/accounts";
import { createSetup, listSetups, type Setup } from "@/src/lib/setups";
import {
  listTags,
  listTradeTagIds,
  setTradeTags,
  type Tag,
} from "@/src/lib/tags";
import { TagChip } from "@/src/components/ui/tag-chip";
import {
  computeRR,
  createTrade,
  deleteTrade,
  listTrades,
  realizedPnl,
  updateTrade,
  type Trade,
  type TradeDirection,
  type TradeInput,
} from "@/src/lib/trades";
import { formatMoney } from "@/src/lib/format";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { FilterSelect } from "@/src/components/ui/filter-select";
import { Select } from "@/src/components/ui/select";
import { TextField } from "@/src/components/ui/text-field";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";
import { Table, TBody, TD, TH, THead, TR } from "@/src/components/ui/table";

const SESSIONS = ["London", "New York", "Tokyo", "Sydney"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const NEW_SETUP = "__new__";

type FormState = {
  account_id: string;
  pair: string;
  direction: TradeDirection;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  exit_price: string;
  profit_loss: string;
  lot_size: string;
  risk_percent: string;
  session: string;
  timeframe: string;
  setup_id: string;
  new_setup_name: string;
  entry_time: string;
  exit_time: string;
  notes: string;
};

function nowLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatRR(rr: number | null): string {
  return rr == null ? "—" : `${rr.toFixed(2)}R`;
}

export default function TradesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [setups, setSetups] = useState<Setup[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [deleting, setDeleting] = useState<Trade | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTrades(), listAccounts(), listSetups(), listTags()])
      .then(([tradeData, accountData, setupData, tagData]) => {
        if (cancelled) return;
        setTrades(tradeData);
        setAccounts(accountData);
        setSetups(setupData);
        setAllTags(tagData);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your trades",
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
  }, [toast]);

  const filtered = useMemo(
    () =>
      trades.filter(
        (t) =>
          (accountFilter === "all" || t.account_id === accountFilter) &&
          (statusFilter === "all" || t.status === statusFilter),
      ),
    [trades, accountFilter, statusFilter],
  );

  function blankForm(): FormState {
    return {
      account_id:
        accounts.find((a) => a.is_active)?.id ?? accounts[0]?.id ?? "",
      pair: "",
      direction: "Buy",
      entry_price: "",
      stop_loss: "",
      take_profit: "",
      exit_price: "",
      profit_loss: "",
      lot_size: "",
      risk_percent: "",
      session: "",
      timeframe: "",
      setup_id: "",
      new_setup_name: "",
      entry_time: nowLocal(),
      exit_time: "",
      notes: "",
    };
  }

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setSelectedTagIds([]);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(trade: Trade) {
    setEditing(trade);
    setForm({
      account_id: trade.account_id,
      pair: trade.pair,
      direction: trade.direction,
      entry_price: String(trade.entry_price),
      stop_loss: trade.stop_loss != null ? String(trade.stop_loss) : "",
      take_profit: trade.take_profit != null ? String(trade.take_profit) : "",
      exit_price: trade.exit_price != null ? String(trade.exit_price) : "",
      profit_loss: trade.profit_loss != null ? String(trade.profit_loss) : "",
      lot_size: trade.lot_size != null ? String(trade.lot_size) : "",
      risk_percent:
        trade.risk_percent != null ? String(trade.risk_percent) : "",
      session: trade.session ?? "",
      timeframe: trade.timeframe ?? "",
      setup_id: trade.setup_id ?? "",
      new_setup_name: "",
      entry_time: toDatetimeLocal(trade.entry_time),
      exit_time: toDatetimeLocal(trade.exit_time),
      notes: trade.notes ?? "",
    });
    setErrors({});
    setSelectedTagIds([]);
    listTradeTagIds(trade.id)
      .then(setSelectedTagIds)
      .catch(() => {
        // Tag prefill is non-critical; the picker just starts empty.
      });
    setFormOpen(true);
  }

  const liveRR = useMemo(() => {
    if (!form) return null;
    const entry = parseNumber(form.entry_price);
    const stop = parseNumber(form.stop_loss);
    const target =
      parseNumber(form.exit_price) ?? parseNumber(form.take_profit);
    return computeRR(form.direction, entry, stop, target);
  }, [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !form) return;

    const nextErrors: Record<string, string> = {};
    const pair = form.pair.trim().toUpperCase();
    const entry = parseNumber(form.entry_price);
    const lot = parseNumber(form.lot_size);

    if (!form.account_id) nextErrors.account = "Pick an account.";
    if (!pair) nextErrors.pair = "Which pair did you trade?";
    if (entry == null) nextErrors.entry = "Enter the entry price.";
    if (form.lot_size.trim() !== "" && (lot == null || lot <= 0)) {
      nextErrors.lot = "Lot size must be a positive number.";
    }
    if (form.setup_id === NEW_SETUP && !form.new_setup_name.trim()) {
      nextErrors.newSetup = "Name the new setup.";
    }
    if (!form.entry_time) nextErrors.entryTime = "When did you enter?";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      let setupId: string | null = form.setup_id || null;
      if (form.setup_id === NEW_SETUP) {
        const created = await createSetup(
          user.id,
          form.new_setup_name.trim(),
        );
        setSetups((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setupId = created.id;
      }

      const exit = parseNumber(form.exit_price);
      const stop = parseNumber(form.stop_loss);
      const target = exit ?? parseNumber(form.take_profit);
      const closed = exit != null;

      const input: TradeInput = {
        account_id: form.account_id,
        setup_id: setupId,
        pair,
        direction: form.direction,
        entry_price: entry as number,
        exit_price: exit,
        stop_loss: stop,
        take_profit: parseNumber(form.take_profit),
        lot_size: lot,
        risk_percent: parseNumber(form.risk_percent),
        session: form.session || null,
        timeframe: form.timeframe || null,
        notes: form.notes.trim() || null,
        profit_loss: closed ? parseNumber(form.profit_loss) : null,
        rr: computeRR(form.direction, entry, stop, target),
        status: closed ? "Closed" : "Open",
        entry_time: new Date(form.entry_time).toISOString(),
        exit_time: closed
          ? new Date(form.exit_time || Date.now()).toISOString()
          : null,
      };

      let balanceOk = true;
      let tagsOk = true;
      if (editing) {
        const updated = await updateTrade(editing.id, input);
        try {
          await setTradeTags(updated.id, selectedTagIds);
        } catch {
          tagsOk = false;
        }
        setTrades((current) =>
          current.map((t) => (t.id === updated.id ? updated : t)),
        );
        try {
          if (editing.account_id === updated.account_id) {
            await adjustAccountBalance(
              updated.account_id,
              realizedPnl(updated) - realizedPnl(editing),
            );
          } else {
            await adjustAccountBalance(
              editing.account_id,
              -realizedPnl(editing),
            );
            await adjustAccountBalance(
              updated.account_id,
              realizedPnl(updated),
            );
          }
        } catch {
          balanceOk = false;
        }
        toast({ title: "Trade updated", variant: "success" });
      } else {
        const created = await createTrade(user.id, input);
        setTrades((current) => [created, ...current]);
        if (selectedTagIds.length > 0) {
          try {
            await setTradeTags(created.id, selectedTagIds);
          } catch {
            tagsOk = false;
          }
        }
        try {
          await adjustAccountBalance(
            created.account_id,
            realizedPnl(created),
          );
        } catch {
          balanceOk = false;
        }
        toast({ title: "Trade logged", variant: "success" });
      }
      if (!balanceOk) {
        toast({
          title: "Balance not updated",
          description:
            "The trade saved, but the account balance couldn't be adjusted.",
          variant: "info",
        });
      }
      if (!tagsOk) {
        toast({
          title: "Tags not saved",
          description:
            "The trade saved, but its tags couldn't be updated. Edit the trade to retry.",
          variant: "info",
        });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing ? "Couldn't update the trade" : "Couldn't log the trade",
        description:
          (error as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTrade(deleting.id);
      setTrades((current) => current.filter((t) => t.id !== deleting.id));
      try {
        await adjustAccountBalance(
          deleting.account_id,
          -realizedPnl(deleting),
        );
      } catch {
        toast({
          title: "Balance not updated",
          description:
            "The trade was deleted, but the account balance couldn't be adjusted.",
          variant: "info",
        });
      }
      toast({ title: "Trade deleted", variant: "success" });
      setDeleting(null);
    } catch {
      toast({
        title: "Couldn't delete the trade",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div
        className="h-72 animate-pulse rounded-lg border border-edge bg-surface"
        aria-hidden="true"
      />
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="Create an account first"
        description="Every trade is logged against a trading account. Add your first account, then come back to start journaling."
        action={
          <Link
            href="/accounts"
            className="inline-flex h-11 select-none items-center justify-center gap-2 rounded-md bg-primary px-4 text-[15px] font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Go to Accounts
          </Link>
        }
      />
    );
  }

  return (
    <>
      {trades.length === 0 ? (
        <EmptyState
          title="Log your first trade"
          description="Pair, direction, prices, and the reasoning behind the trade — everything lives here, and the dashboard builds itself from what you log."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Log trade
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              aria-label="Filter by account"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="all">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All trades</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </FilterSelect>
            <p className="text-[13px] text-muted">
              {filtered.length} of {trades.length}
            </p>
            <div className="ml-auto">
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" aria-hidden="true" />
                Log trade
              </Button>
            </div>
          </div>

          <section className="overflow-hidden rounded-lg border border-edge bg-surface">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Pair</TH>
                  <TH>Direction</TH>
                  <TH>Setup</TH>
                  <TH numeric>Entry</TH>
                  <TH numeric>Exit</TH>
                  <TH numeric>RR</TH>
                  <TH numeric>P/L</TH>
                  <TH aria-label="Actions" />
                </TR>
              </THead>
              <TBody>
                {filtered.map((trade) => (
                  <TR
                    key={trade.id}
                    interactive
                    onClick={() => router.push(`/trades/${trade.id}`)}
                  >
                    <TD className="text-muted">
                      {formatDate(trade.entry_time)}
                    </TD>
                    <TD className="font-medium">
                      <Link
                        href={`/trades/${trade.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-sm text-ink hover:underline"
                      >
                        {trade.pair}
                      </Link>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                        {trade.direction === "Buy" ? (
                          <ArrowUpRight
                            className="size-3.5 text-positive"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowDownRight
                            className="size-3.5 text-negative"
                            aria-hidden="true"
                          />
                        )}
                        {trade.direction === "Buy" ? "Buy" : "Sell"}
                      </span>
                    </TD>
                    <TD className="text-muted">
                      {trade.setups?.name ?? "—"}
                    </TD>
                    <TD numeric>{trade.entry_price}</TD>
                    <TD numeric className="text-muted">
                      {trade.exit_price ?? "—"}
                    </TD>
                    <TD numeric className="text-muted">
                      {formatRR(trade.rr)}
                    </TD>
                    <TD numeric>
                      {trade.status === "Open" ? (
                        <Badge>Open</Badge>
                      ) : trade.profit_loss != null ? (
                        <span
                          className={`font-medium ${
                            trade.profit_loss >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {trade.profit_loss >= 0 ? "+" : ""}
                          {formatMoney(
                            trade.profit_loss,
                            trade.accounts?.currency ?? "USD",
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="w-0">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(trade);
                          }}
                          aria-label={`Edit ${trade.pair} trade`}
                          className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(trade);
                          }}
                          aria-label={`Delete ${trade.pair} trade`}
                          className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-negative/10 hover:text-negative"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </section>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit trade" : "Log trade"}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="trade-form" size="sm" loading={saving}>
              {editing ? "Save changes" : "Log trade"}
            </Button>
          </>
        }
      >
        {form && (
          <form id="trade-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Account"
                error={errors.account}
                value={form.account_id}
                onChange={(e) =>
                  setForm({ ...form, account_id: e.target.value })
                }
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                  </option>
                ))}
              </Select>
              <TextField
                label="Pair"
                placeholder="EURUSD"
                required
                error={errors.pair}
                value={form.pair}
                onChange={(e) => {
                  setForm({ ...form, pair: e.target.value.toUpperCase() });
                  if (errors.pair) setErrors({ ...errors, pair: "" });
                }}
                className="uppercase"
              />
            </div>

            <div>
              <span className="block text-[13px] font-medium text-muted">
                Direction
              </span>
              <div
                role="radiogroup"
                aria-label="Direction"
                className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-edge bg-surface p-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.direction === "Buy"}
                  onClick={() => setForm({ ...form, direction: "Buy" })}
                  className={`h-9 rounded-sm text-[14px] font-medium transition-colors duration-150 ease-out active:scale-[0.99] ${
                    form.direction === "Buy"
                      ? "bg-positive/15 text-positive"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.direction === "Sell"}
                  onClick={() => setForm({ ...form, direction: "Sell" })}
                  className={`h-9 rounded-sm text-[14px] font-medium transition-colors duration-150 ease-out active:scale-[0.99] ${
                    form.direction === "Sell"
                      ? "bg-negative/15 text-negative"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Sell
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Entry"
                inputMode="decimal"
                required
                error={errors.entry}
                value={form.entry_price}
                onChange={(e) => {
                  setForm({ ...form, entry_price: e.target.value });
                  if (errors.entry) setErrors({ ...errors, entry: "" });
                }}
              />
              <TextField
                label="Stop loss"
                inputMode="decimal"
                value={form.stop_loss}
                onChange={(e) =>
                  setForm({ ...form, stop_loss: e.target.value })
                }
              />
              <TextField
                label="Take profit"
                inputMode="decimal"
                value={form.take_profit}
                onChange={(e) =>
                  setForm({ ...form, take_profit: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Exit price"
                inputMode="decimal"
                hint="Leave empty while the trade is open."
                value={form.exit_price}
                onChange={(e) =>
                  setForm({ ...form, exit_price: e.target.value })
                }
              />
              <TextField
                label="P/L"
                inputMode="decimal"
                hint="Realized, in account currency."
                value={form.profit_loss}
                onChange={(e) =>
                  setForm({ ...form, profit_loss: e.target.value })
                }
              />
              <TextField
                label="Lot size"
                inputMode="decimal"
                error={errors.lot}
                value={form.lot_size}
                onChange={(e) => {
                  setForm({ ...form, lot_size: e.target.value });
                  if (errors.lot) setErrors({ ...errors, lot: "" });
                }}
              />
            </div>

            {liveRR != null && (
              <p className="tabular animate-fade rounded-md bg-white/5 px-3 py-2 text-[13px] text-muted">
                {form.exit_price
                  ? "Realized"
                  : "Planned"}{" "}
                R multiple:{" "}
                <span
                  className={`font-medium ${
                    liveRR >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {liveRR.toFixed(2)}R
                </span>
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Risk %"
                inputMode="decimal"
                placeholder="1"
                value={form.risk_percent}
                onChange={(e) =>
                  setForm({ ...form, risk_percent: e.target.value })
                }
              />
              <Select
                label="Session"
                value={form.session}
                onChange={(e) => setForm({ ...form, session: e.target.value })}
              >
                <option value="">—</option>
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="Timeframe"
                value={form.timeframe}
                onChange={(e) =>
                  setForm({ ...form, timeframe: e.target.value })
                }
              >
                <option value="">—</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Setup"
                value={form.setup_id}
                onChange={(e) =>
                  setForm({ ...form, setup_id: e.target.value })
                }
              >
                <option value="">None</option>
                {setups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value={NEW_SETUP}>+ New setup…</option>
              </Select>
              {form.setup_id === NEW_SETUP && (
                <TextField
                  label="New setup name"
                  placeholder="e.g. London breakout"
                  error={errors.newSetup}
                  value={form.new_setup_name}
                  onChange={(e) => {
                    setForm({ ...form, new_setup_name: e.target.value });
                    if (errors.newSetup)
                      setErrors({ ...errors, newSetup: "" });
                  }}
                />
              )}
            </div>

            {allTags.length > 0 && (
              <div>
                <span className="block text-[13px] font-medium text-muted">
                  Tags
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      selected={selectedTagIds.includes(tag.id)}
                      onClick={() =>
                        setSelectedTagIds((current) =>
                          current.includes(tag.id)
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id],
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Entry time"
                type="datetime-local"
                required
                error={errors.entryTime}
                value={form.entry_time}
                onChange={(e) =>
                  setForm({ ...form, entry_time: e.target.value })
                }
              />
              <TextField
                label="Exit time"
                type="datetime-local"
                hint="Defaults to now when an exit price is set."
                value={form.exit_time}
                onChange={(e) =>
                  setForm({ ...form, exit_time: e.target.value })
                }
              />
            </div>

            <Textarea
              label="Notes"
              placeholder="Why did you take this trade? What was the plan?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.pair ?? ""} trade?`}
        description="This permanently removes the trade and rolls its P/L out of the account balance."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deleteBusy}
              onClick={handleDelete}
            >
              Delete trade
            </Button>
          </>
        }
      />
    </>
  );
}

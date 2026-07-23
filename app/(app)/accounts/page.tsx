"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  countTradesForAccount,
  createAccount,
  deleteAccount,
  deleteAccountAndTrades,
  listAccounts,
  unassignTradesAndDeleteAccount,
  updateAccount,
  type Account,
} from "@/src/lib/accounts";
import { formatMoney, formatSignedMoney } from "@/src/lib/format";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { Select } from "@/src/components/ui/select";
import { TextField } from "@/src/components/ui/text-field";
import { useToast } from "@/src/components/ui/toast";

const ACCOUNT_TYPES = [
  { value: "live", label: "Live" },
  { value: "demo", label: "Demo" },
  { value: "prop", label: "Prop firm" },
  { value: "paper", label: "Paper" },
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
];

type FormState = {
  account_name: string;
  broker: string;
  account_type: string;
  initial_balance: string;
  currency: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  account_name: "",
  broker: "",
  account_type: "live",
  initial_balance: "",
  currency: "USD",
  is_active: true,
};

function typeLabel(value: string | null): string {
  return (
    ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? value ?? "—"
  );
}

function accountReturn(account: Account): {
  pnl: number;
  pct: number | null;
} {
  const pnl =
    Math.round((account.current_balance - account.initial_balance) * 100) /
    100;
  const pct =
    account.initial_balance !== 0
      ? Math.round((pnl / account.initial_balance) * 10000) / 100
      : null;
  return { pnl, pct };
}

export default function AccountsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nameError, setNameError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Account | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [tradeCount, setTradeCount] = useState<number | null>(null);
  // "delete": remove account + its trades. "keep": unassign trades, keep them.
  const [deleteMode, setDeleteMode] = useState<"delete" | "keep">("delete");
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (cancelled) return;
        setAccounts(data);
        // Deep link from the dashboard's "Add account" quick action.
        if (
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("new")
        ) {
          openCreate();
          window.history.replaceState(null, "", "/accounts");
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your accounts",
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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setNameError(null);
    setBalanceError(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      account_name: account.account_name,
      broker: account.broker ?? "",
      account_type: account.account_type ?? "live",
      initial_balance: String(account.initial_balance),
      currency: account.currency ?? "USD",
      is_active: account.is_active,
    });
    setNameError(null);
    setBalanceError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    let valid = true;
    const name = form.account_name.trim();
    if (!name) {
      setNameError("Give the account a name.");
      valid = false;
    }
    const balance = Number(form.initial_balance);
    if (
      form.initial_balance.trim() === "" ||
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      setBalanceError("Enter a valid starting balance.");
      valid = false;
    }
    if (!valid) return;

    setSaving(true);
    const input = {
      account_name: name,
      broker: form.broker.trim() || null,
      account_type: form.account_type,
      initial_balance: balance,
      currency: form.currency,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        const updated = await updateAccount(editing, input);
        setAccounts((current) =>
          current.map((a) => (a.id === updated.id ? updated : a)),
        );
        toast({ title: "Account updated", variant: "success" });
      } else {
        const created = await createAccount(user.id, input);
        setAccounts((current) => [...current, created]);
        toast({ title: "Account created", variant: "success" });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing
          ? "Couldn't update the account"
          : "Couldn't create the account",
        description:
          (error as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function openDelete(account: Account) {
    setDeleting(account);
    setDeleteMode("delete");
    setConfirmText("");
    setTradeCount(null);
    countTradesForAccount(account.id)
      .then(setTradeCount)
      .catch(() => setTradeCount(0));
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      if ((tradeCount ?? 0) === 0) {
        await deleteAccount(deleting.id);
      } else if (deleteMode === "keep") {
        await unassignTradesAndDeleteAccount(deleting.id);
      } else {
        await deleteAccountAndTrades(deleting.id);
      }
      setAccounts((current) => current.filter((a) => a.id !== deleting.id));
      toast({
        title:
          deleteMode === "keep" && (tradeCount ?? 0) > 0
            ? "Account deleted, trades kept"
            : "Account deleted",
        variant: "success",
      });
      setDeleting(null);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast({
        title: "Couldn't delete the account",
        description:
          code === "23502"
            ? "These trades require an account, so they can't be kept unassigned. Choose “Delete everything” instead."
            : (error as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-edge bg-surface"
          />
        ))}
      </div>
    );
  }

  const deleteCount = tradeCount ?? 0;
  const needsTypeConfirm = deleteCount > 0 && deleteMode === "delete";
  const canConfirmDelete =
    tradeCount !== null &&
    (!needsTypeConfirm || confirmText.trim() === deleting?.account_name);
  const deleteLabel =
    deleteCount === 0
      ? "Delete account"
      : deleteMode === "keep"
        ? "Delete account, keep trades"
        : "Delete everything";

  return (
    <>
      {accounts.length === 0 ? (
        <EmptyState
          title="No trading accounts yet"
          description="Add each account you trade — live, demo, or prop — and every trade you log will be tied to one. Balances and P&L stay separated per account."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New account
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] text-muted">
              {accounts.length}{" "}
              {accounts.length === 1 ? "account" : "accounts"}
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New account
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => {
              const { pnl, pct } = accountReturn(account);
              const up = pnl > 0;
              const down = pnl < 0;
              const tone = up
                ? "text-positive"
                : down
                  ? "text-negative"
                  : "text-muted";
              return (
                <article
                  key={account.id}
                  className={`group relative flex flex-col rounded-lg border border-edge bg-surface p-5 transition-[border-color] duration-150 ease-out hover:border-edge-strong ${
                    account.is_active ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {account.account_name}
                      </h2>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {account.broker || typeLabel(account.account_type)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(account)}
                        aria-label={`Edit ${account.account_name}`}
                        className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDelete(account)}
                        aria-label={`Delete ${account.account_name}`}
                        className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-negative/10 hover:text-negative"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="tabular text-2xl font-semibold tracking-[-0.01em] text-ink">
                      {formatMoney(
                        account.current_balance,
                        account.currency,
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px]">
                      <span
                        className={`tabular inline-flex items-center gap-0.5 font-medium ${tone}`}
                      >
                        {up && (
                          <ArrowUpRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {down && (
                          <ArrowDownRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {formatSignedMoney(pnl, account.currency)}
                      </span>
                      {pct !== null && (
                        <span className={`tabular ${tone}`}>
                          ({pct < 0 ? "−" : ""}
                          {Math.abs(pct).toFixed(2)}%)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-edge pt-4 text-[12px] text-muted">
                    <Badge>{typeLabel(account.account_type)}</Badge>
                    <span className="text-faint">{account.currency}</span>
                    <span className="text-faint">·</span>
                    <span>
                      Start{" "}
                      <span className="tabular text-muted">
                        {formatMoney(
                          account.initial_balance,
                          account.currency,
                        )}
                      </span>
                    </span>
                    {!account.is_active && (
                      <span className="ml-auto text-faint">Inactive</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit account" : "New account"}
        description={
          editing
            ? undefined
            : "Trades you log will be tied to this account."
        }
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
            <Button
              type="submit"
              form="account-form"
              size="sm"
              loading={saving}
            >
              {editing ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <form
          id="account-form"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <TextField
            label="Account name"
            placeholder="e.g. FTMO 100K"
            maxLength={60}
            required
            error={nameError ?? undefined}
            value={form.account_name}
            onChange={(e) => {
              setForm({ ...form, account_name: e.target.value });
              if (nameError) setNameError(null);
            }}
          />
          <TextField
            label="Broker"
            placeholder="e.g. IC Markets"
            maxLength={60}
            value={form.broker}
            onChange={(e) => setForm({ ...form, broker: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value })
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <TextField
            label="Starting balance"
            inputMode="decimal"
            placeholder="10000"
            required
            error={balanceError ?? undefined}
            hint={
              editing && !balanceError
                ? "Adjusting this shifts the current balance by the same amount."
                : undefined
            }
            value={form.initial_balance}
            onChange={(e) => {
              setForm({ ...form, initial_balance: e.target.value });
              if (balanceError) setBalanceError(null);
            }}
          />
          {editing && (
            <label className="flex items-center gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active account
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.account_name ?? "account"}?`}
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
              disabled={!canConfirmDelete}
              onClick={handleDelete}
            >
              {deleteLabel}
            </Button>
          </>
        }
      >
        {deleting &&
          (tradeCount === null ? (
            <p className="text-[14px] text-muted">Checking for trades…</p>
          ) : tradeCount === 0 ? (
            <p className="text-[14px] leading-relaxed text-muted">
              This account has no trades. Deleting it is permanent and
              can&apos;t be undone.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-[14px] leading-relaxed text-muted">
                This account has{" "}
                <span className="font-medium text-ink">
                  {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
                </span>{" "}
                logged against it. Choose what happens to them.
              </p>

              <div role="radiogroup" className="space-y-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={deleteMode === "delete"}
                  onClick={() => setDeleteMode("delete")}
                  className={`w-full rounded-md border p-3 text-left transition-colors duration-150 ease-out ${
                    deleteMode === "delete"
                      ? "border-negative/50 bg-negative/10"
                      : "border-edge hover:border-edge-strong"
                  }`}
                >
                  <p className="text-[14px] font-medium text-ink">
                    Delete the account and its {tradeCount}{" "}
                    {tradeCount === 1 ? "trade" : "trades"}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    Permanently removes every trade, screenshot, and tag on
                    this account. This can&apos;t be undone.
                  </p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={deleteMode === "keep"}
                  onClick={() => setDeleteMode("keep")}
                  className={`w-full rounded-md border p-3 text-left transition-colors duration-150 ease-out ${
                    deleteMode === "keep"
                      ? "border-ink/50 bg-selected"
                      : "border-edge hover:border-edge-strong"
                  }`}
                >
                  <p className="text-[14px] font-medium text-ink">
                    Keep the {tradeCount}{" "}
                    {tradeCount === 1 ? "trade" : "trades"}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    Deletes the account but keeps the trade history —
                    they&apos;ll no longer be tied to any account.
                  </p>
                </button>
              </div>

              {deleteMode === "delete" && (
                <TextField
                  label={`Type “${deleting.account_name}” to confirm`}
                  autoComplete="off"
                  placeholder={deleting.account_name}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              )}
            </div>
          ))}
      </Modal>
    </>
  );
}

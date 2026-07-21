"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type Account,
} from "@/src/lib/accounts";
import { formatMoney } from "@/src/lib/format";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { Select } from "@/src/components/ui/select";
import { TextField } from "@/src/components/ui/text-field";
import { useToast } from "@/src/components/ui/toast";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/src/components/ui/table";

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

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
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
      currency: account.currency,
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

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteAccount(deleting.id);
      setAccounts((current) =>
        current.filter((a) => a.id !== deleting.id),
      );
      toast({ title: "Account deleted", variant: "success" });
      setDeleting(null);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast({
        title: "Couldn't delete the account",
        description:
          code === "23503"
            ? "This account has trades attached to it. Delete or reassign those trades first."
            : "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div
        className="h-64 animate-pulse rounded-lg border border-edge bg-surface"
        aria-hidden="true"
      />
    );
  }

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

          <section className="overflow-hidden rounded-lg border border-edge bg-surface">
            <Table>
              <THead>
                <TR>
                  <TH>Account</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH numeric>Starting balance</TH>
                  <TH numeric>Current balance</TH>
                  <TH aria-label="Actions" />
                </TR>
              </THead>
              <TBody>
                {accounts.map((account) => (
                  <TR key={account.id}>
                    <TD>
                      <div className="leading-tight">
                        <p className="font-medium">{account.account_name}</p>
                        {account.broker && (
                          <p className="mt-0.5 text-[13px] text-muted">
                            {account.broker}
                          </p>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <Badge>{typeLabel(account.account_type)}</Badge>
                    </TD>
                    <TD>
                      {account.is_active ? (
                        <Badge variant="positive">
                          <span
                            className="size-1.5 rounded-full bg-positive"
                            aria-hidden="true"
                          />
                          Active
                        </Badge>
                      ) : (
                        <Badge>Inactive</Badge>
                      )}
                    </TD>
                    <TD numeric className="text-muted">
                      {formatMoney(account.initial_balance, account.currency)}
                    </TD>
                    <TD numeric className="font-medium">
                      {formatMoney(account.current_balance, account.currency)}
                    </TD>
                    <TD className="w-0">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          aria-label={`Edit ${account.account_name}`}
                          className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(account)}
                          aria-label={`Delete ${account.account_name}`}
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
        description="This permanently removes the account. Trades attached to it must be deleted or reassigned first."
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
              Delete account
            </Button>
          </>
        }
      />
    </>
  );
}

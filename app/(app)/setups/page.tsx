"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  createSetup,
  deleteSetup,
  listSetupsWithStats,
  updateSetup,
  type SetupWithTrades,
} from "@/src/lib/setups";
import {
  CHECKLIST_SECTIONS,
  countItems,
  linesToItems,
  parseSetupChecklist,
  serializeSetupChecklist,
  type ChecklistSections,
} from "@/src/lib/checklist";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { TextField } from "@/src/components/ui/text-field";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";
import { Table, TBody, TD, TH, THead, TR } from "@/src/components/ui/table";

const SECTION_PLACEHOLDERS: Record<string, string> = {
  entry: "Sweep of prior high\nDisplacement down\nOne item per line…",
  confirmations: "FVG present\nVolume spike\nAligned with HTF bias",
  invalidation: "Close back above the sweep\nNo displacement within 3 candles",
};

const SUGGESTIONS = [
  "SMT Divergence",
  "Liquidity Sweep",
  "MSS",
  "BOS",
  "FVG",
  "Order Block",
];

function setupStats(setup: SetupWithTrades) {
  const total = setup.trades.length;
  const closed = setup.trades.filter(
    (t) => t.status === "Closed" && t.profit_loss != null,
  );
  const wins = closed.filter((t) => (t.profit_loss ?? 0) > 0).length;
  const winRate =
    closed.length > 0 ? Math.round((wins / closed.length) * 100) : null;
  return { total, winRate };
}

export default function SetupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [setups, setSetups] = useState<SetupWithTrades[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SetupWithTrades | null>(null);
  const [name, setName] = useState("");
  // Each section is a textarea's raw text; one item per line.
  const [sectionText, setSectionText] = useState<Record<string, string>>({
    entry: "",
    confirmations: "",
    invalidation: "",
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<SetupWithTrades | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSetupsWithStats()
      .then((data) => {
        if (!cancelled) setSetups(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your setups",
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
    setName("");
    setSectionText({ entry: "", confirmations: "", invalidation: "" });
    setNameError(null);
    setFormOpen(true);
  }

  function openEdit(setup: SetupWithTrades) {
    setEditing(setup);
    setName(setup.name);
    const parsed = parseSetupChecklist(setup.description);
    setSectionText({
      entry: parsed.entry.join("\n"),
      confirmations: parsed.confirmations.join("\n"),
      invalidation: parsed.invalidation.join("\n"),
    });
    setNameError(null);
    setFormOpen(true);
  }

  async function quickAdd(suggestion: string) {
    if (!user) return;
    setQuickAdding(suggestion);
    try {
      const created = await createSetup(user.id, suggestion);
      setSetups((current) =>
        [...current, { ...created, trades: [] }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      toast({ title: `“${suggestion}” added`, variant: "success" });
    } catch {
      toast({
        title: "Couldn't add the setup",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setQuickAdding(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Give the setup a name.");
      return;
    }

    const sections: ChecklistSections = {
      entry: linesToItems(sectionText.entry),
      confirmations: linesToItems(sectionText.confirmations),
      invalidation: linesToItems(sectionText.invalidation),
    };
    const description = serializeSetupChecklist(sections);

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateSetup(editing.id, {
          name: trimmed,
          description,
        });
        setSetups((current) =>
          current
            .map((s) =>
              s.id === updated.id ? { ...s, ...updated } : s,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast({ title: "Setup updated", variant: "success" });
      } else {
        const created = await createSetup(user.id, trimmed, description);
        setSetups((current) =>
          [...current, { ...created, trades: [] }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        toast({ title: "Setup created", variant: "success" });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing
          ? "Couldn't update the setup"
          : "Couldn't create the setup",
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
      await deleteSetup(deleting.id);
      setSetups((current) => current.filter((s) => s.id !== deleting.id));
      toast({ title: "Setup deleted", variant: "success" });
      setDeleting(null);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast({
        title: "Couldn't delete the setup",
        description:
          code === "23503"
            ? "Trades still reference this setup. Reassign them first."
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

  const remainingSuggestions = SUGGESTIONS.filter(
    (s) => !setups.some((x) => x.name.toLowerCase() === s.toLowerCase()),
  );

  return (
    <>
      {setups.length === 0 ? (
        <EmptyState
          title="Name your playbook"
          description="Setups are the patterns you trade — tag each trade with one and you'll see which ones actually pay. Start from the classics or add your own."
          action={
            <div className="flex flex-col items-center gap-4">
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={quickAdding !== null}
                    onClick={() => quickAdd(s)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-edge px-3 text-[13px] text-muted transition-colors duration-150 ease-out hover:border-ink/40 hover:text-ink active:scale-[0.98] disabled:opacity-50"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {quickAdding === s ? "Adding…" : s}
                  </button>
                ))}
              </div>
              <Button onClick={openCreate}>New setup</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] text-muted">
              {setups.length} {setups.length === 1 ? "setup" : "setups"}
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New setup
            </Button>
          </div>

          <section className="overflow-hidden rounded-lg border border-edge bg-surface">
            <Table>
              <THead>
                <TR>
                  <TH>Setup</TH>
                  <TH numeric>Trades</TH>
                  <TH numeric>Win rate</TH>
                  <TH aria-label="Actions" />
                </TR>
              </THead>
              <TBody>
                {setups.map((setup) => {
                  const stats = setupStats(setup);
                  const rules = countItems(
                    parseSetupChecklist(setup.description),
                  );
                  return (
                    <TR key={setup.id}>
                      <TD className="whitespace-normal">
                        <p className="font-medium">{setup.name}</p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {rules > 0
                            ? `${rules} ${rules === 1 ? "rule" : "rules"}`
                            : "No checklist"}
                        </p>
                      </TD>
                      <TD numeric className="text-muted">
                        {stats.total}
                      </TD>
                      <TD numeric className="text-muted">
                        {stats.winRate != null ? `${stats.winRate}%` : "—"}
                      </TD>
                      <TD className="w-0">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(setup)}
                            aria-label={`Edit ${setup.name}`}
                            className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(setup)}
                            aria-label={`Delete ${setup.name}`}
                            className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-negative/10 hover:text-negative"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </section>

          {remainingSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-faint">Quick add:</span>
              {remainingSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={quickAdding !== null}
                  onClick={() => quickAdd(s)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-edge px-2.5 text-[12px] text-muted transition-colors duration-150 ease-out hover:border-ink/40 hover:text-ink active:scale-[0.98] disabled:opacity-50"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  {quickAdding === s ? "Adding…" : s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit setup" : "New setup"}
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
            <Button type="submit" form="setup-form" size="sm" loading={saving}>
              {editing ? "Save changes" : "Create setup"}
            </Button>
          </>
        }
      >
        <form id="setup-form" onSubmit={handleSubmit} className="space-y-5">
          <TextField
            label="Name"
            placeholder="e.g. Liquidity Sweep"
            maxLength={60}
            required
            error={nameError ?? undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
          />
          <p className="text-[13px] text-muted">
            One item per line. Each becomes a checkbox when you log a trade
            with this setup.
          </p>
          {CHECKLIST_SECTIONS.map((section) => (
            <Textarea
              key={section.key}
              label={section.heading}
              placeholder={SECTION_PLACEHOLDERS[section.key]}
              rows={3}
              value={sectionText[section.key]}
              onChange={(e) =>
                setSectionText((current) => ({
                  ...current,
                  [section.key]: e.target.value,
                }))
              }
            />
          ))}
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? "setup"}?`}
        description="Trades keep their history, but this setup disappears from your playbook."
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
              Delete setup
            </Button>
          </>
        }
      />
    </>
  );
}

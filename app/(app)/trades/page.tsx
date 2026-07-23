"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartCandlestick,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  listAccounts,
  adjustAccountBalance,
  type Account,
} from "@/src/lib/accounts";
import { createSetup, listSetups, type Setup } from "@/src/lib/setups";
import {
  CHECKLIST_SECTIONS,
  checklistScore,
  parseSetupChecklist,
  parseTradeNotes,
  sectionsToItems,
  serializeTradeNotes,
  type ChecklistItem,
} from "@/src/lib/checklist";
import {
  listTags,
  listTradeTagIds,
  setTradeTags,
  type Tag,
} from "@/src/lib/tags";
import {
  deleteTradeImage,
  listImagesForTrades,
  pickSnapshot,
  POST_TRADE_TYPE,
  PRE_TRADE_TYPE,
  tradeImageUrls,
  uploadTradeImage,
  type TradeImage,
  type TradeImageType,
} from "@/src/lib/trade-images";
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
import { TagChip } from "@/src/components/ui/tag-chip";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { FilterSelect } from "@/src/components/ui/filter-select";
import { Modal } from "@/src/components/ui/modal";
import { Select } from "@/src/components/ui/select";
import { TextField } from "@/src/components/ui/text-field";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";

const SESSIONS = ["London", "New York", "Tokyo", "Sydney"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const NEW_SETUP = "__new__";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

type SlotImage = TradeImage & { signedUrl?: string };

type SlotState = {
  existing: SlotImage | null;
  file: File | null;
  preview: string | null; // object URL for staged file
  removed: boolean;
};

const emptySlot: SlotState = {
  existing: null,
  file: null,
  preview: null,
  removed: false,
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

function tradeDuration(trade: Trade): string | null {
  if (!trade.exit_time) return null;
  const ms =
    new Date(trade.exit_time).getTime() -
    new Date(trade.entry_time).getTime();
  if (ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const restH = hours % 24;
  return restH > 0 ? `${days}d ${restH}h` : `${days}d`;
}

function SnapshotSlot({
  label,
  slot,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  slot: SlotState;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shown =
    slot.preview ?? (slot.removed ? null : (slot.existing?.signedUrl ?? null));

  return (
    <div className="min-w-0">
      <span className="block text-[13px] font-medium text-muted">
        {label}
      </span>
      <div className="relative mt-2">
        {shown ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="relative block aspect-video w-full overflow-hidden rounded-md border border-edge transition-[border-color] duration-150 ease-out hover:border-edge-strong"
              aria-label={`Replace ${label} snapshot`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shown}
                alt={`${label} snapshot`}
                className="absolute inset-0 size-full object-cover"
              />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              aria-label={`Remove ${label} snapshot`}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-scrim text-faint backdrop-blur-sm transition-colors duration-150 ease-out hover:text-negative"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) onPick(file);
            }}
            className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-edge-strong text-[13px] text-faint transition-colors duration-150 ease-out hover:border-ink/40 hover:text-muted"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            Add snapshot
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label={`Choose ${label} snapshot`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default function TradesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [setups, setSetups] = useState<Setup[]>([]);
  const [imagesByTrade, setImagesByTrade] = useState<
    Record<string, TradeImage[]>
  >({});
  const [urls, setUrls] = useState<Record<string, string>>({});
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
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [preSlot, setPreSlot] = useState<SlotState>(emptySlot);
  const [postSlot, setPostSlot] = useState<SlotState>(emptySlot);

  const [deleting, setDeleting] = useState<Trade | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tradeData, accountData, setupData, tagData] =
          await Promise.all([
            listTrades(),
            listAccounts(),
            listSetups(),
            listTags(),
          ]);
        if (cancelled) return;
        setTrades(tradeData);
        setAccounts(accountData);
        setSetups(setupData);
        setAllTags(tagData);

        // Deep link from the dashboard's "Log trade" quick action.
        if (
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("new") &&
          accountData.length > 0
        ) {
          openCreate(accountData);
          window.history.replaceState(null, "", "/trades");
        }

        const images = await listImagesForTrades(
          tradeData.map((t) => t.id),
        );
        if (cancelled) return;
        setImagesByTrade(images);
        const paths = Object.values(images)
          .flat()
          .map((i) => i.image_url);
        const signed = await tradeImageUrls(paths);
        if (!cancelled) setUrls(signed);
      } catch {
        if (!cancelled) {
          toast({
            title: "Couldn't load your trades",
            description: "Refresh the page to try again.",
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only load; openCreate is a stable handler we call at most once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const hasUnassigned = useMemo(
    () => trades.some((t) => !t.account_id),
    [trades],
  );

  const filtered = useMemo(
    () =>
      trades.filter(
        (t) =>
          (accountFilter === "all" ||
            (accountFilter === "unassigned"
              ? !t.account_id
              : t.account_id === accountFilter)) &&
          (statusFilter === "all" || t.status === statusFilter),
      ),
    [trades, accountFilter, statusFilter],
  );

  function slotFor(trade: Trade, which: "pre" | "post"): SlotImage | null {
    const image = pickSnapshot(imagesByTrade[trade.id] ?? [], which);
    if (!image) return null;
    return { ...image, signedUrl: urls[image.image_url] };
  }

  function coverFor(trade: Trade): SlotImage | null {
    return slotFor(trade, "post") ?? slotFor(trade, "pre");
  }

  function blankForm(accountList: Account[] = accounts): FormState {
    return {
      account_id:
        accountList.find((a) => a.is_active)?.id ?? accountList[0]?.id ?? "",
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

  function resetSlots(trade: Trade | null) {
    if (!trade) {
      setPreSlot({ ...emptySlot });
      setPostSlot({ ...emptySlot });
      return;
    }
    const pre = pickSnapshot(imagesByTrade[trade.id] ?? [], "pre");
    const post = pickSnapshot(imagesByTrade[trade.id] ?? [], "post");
    setPreSlot({
      existing: pre ? { ...pre, signedUrl: urls[pre.image_url] } : null,
      file: null,
      preview: null,
      removed: false,
    });
    setPostSlot({
      existing: post ? { ...post, signedUrl: urls[post.image_url] } : null,
      file: null,
      preview: null,
      removed: false,
    });
  }

  function stageFile(
    which: "pre" | "post",
    file: File,
  ): void {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "That file isn't an image",
        description: "Use a PNG, JPG, or WebP screenshot.",
        variant: "error",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "Image is too large",
        description: "Keep screenshots under 8 MB.",
        variant: "error",
      });
      return;
    }
    const preview = URL.createObjectURL(file);
    const update = (current: SlotState): SlotState => {
      if (current.preview) URL.revokeObjectURL(current.preview);
      return { ...current, file, preview, removed: false };
    };
    if (which === "pre") setPreSlot(update);
    else setPostSlot(update);
  }

  function clearSlot(which: "pre" | "post") {
    const update = (current: SlotState): SlotState => {
      if (current.preview) URL.revokeObjectURL(current.preview);
      return { ...current, file: null, preview: null, removed: true };
    };
    if (which === "pre") setPreSlot(update);
    else setPostSlot(update);
  }

  /** Build an unchecked checklist from a setup's template. */
  function setupChecklist(setupId: string): ChecklistItem[] {
    const setup = setups.find((s) => s.id === setupId);
    if (!setup) return [];
    return sectionsToItems(parseSetupChecklist(setup.description));
  }

  function handleSetupChange(value: string) {
    setForm((f) => (f ? { ...f, setup_id: value } : f));
    setChecklist(value && value !== NEW_SETUP ? setupChecklist(value) : []);
  }

  function openCreate(accountList?: Account[]) {
    setEditing(null);
    setForm(blankForm(accountList));
    setSelectedTagIds([]);
    setChecklist([]);
    resetSlots(null);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(trade: Trade) {
    setEditing(trade);
    const { prose, checklist: savedChecklist } = parseTradeNotes(trade.notes);
    setForm({
      account_id: trade.account_id ?? "",
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
      notes: prose,
    });
    // Prefer the checklist saved on the trade; fall back to the setup template.
    if (savedChecklist.length > 0) setChecklist(savedChecklist);
    else if (trade.setup_id) setChecklist(setupChecklist(trade.setup_id));
    else setChecklist([]);
    setErrors({});
    setSelectedTagIds([]);
    listTradeTagIds(trade.id)
      .then(setSelectedTagIds)
      .catch(() => {
        // Tag prefill is non-critical; the picker just starts empty.
      });
    resetSlots(trade);
    setFormOpen(true);
  }

  function toggleChecklistItem(index: number) {
    setChecklist((current) =>
      current.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  // Live R multiple: realized once an exit exists, otherwise planned to TP.
  const liveRR = useMemo(() => {
    if (!form) return null;
    const entry = parseNumber(form.entry_price);
    const stop = parseNumber(form.stop_loss);
    const target =
      parseNumber(form.exit_price) ?? parseNumber(form.take_profit);
    return computeRR(form.direction, entry, stop, target);
  }, [form]);

  /** Apply staged slot changes; returns false if any image op failed. */
  async function persistSlots(tradeId: string): Promise<boolean> {
    if (!user) return false;
    let ok = true;
    const jobs: {
      slot: SlotState;
      type: TradeImageType;
    }[] = [
      { slot: preSlot, type: PRE_TRADE_TYPE },
      { slot: postSlot, type: POST_TRADE_TYPE },
    ];

    const nextImages = [...(imagesByTrade[tradeId] ?? [])];
    const nextUrls: Record<string, string> = {};

    for (const { slot, type } of jobs) {
      try {
        const replacing = slot.file != null && slot.existing != null;
        if ((slot.removed || replacing) && slot.existing) {
          await deleteTradeImage(slot.existing);
          const idx = nextImages.findIndex(
            (i) => i.id === slot.existing?.id,
          );
          if (idx >= 0) nextImages.splice(idx, 1);
        }
        if (slot.file) {
          const created = await uploadTradeImage(
            user.id,
            tradeId,
            type,
            slot.file,
          );
          nextImages.push(created);
          const signed = await tradeImageUrls([created.image_url]);
          Object.assign(nextUrls, signed);
        }
      } catch {
        ok = false;
      }
    }

    setImagesByTrade((current) => ({ ...current, [tradeId]: nextImages }));
    setUrls((current) => ({ ...current, ...nextUrls }));
    return ok;
  }

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
        notes: serializeTradeNotes(form.notes, checklist),
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
      let imagesOk = true;
      let savedId: string;

      if (editing) {
        const updated = await updateTrade(editing.id, input);
        savedId = updated.id;
        setTrades((current) =>
          current.map((t) => (t.id === updated.id ? updated : t)),
        );
        try {
          await setTradeTags(updated.id, selectedTagIds);
        } catch {
          tagsOk = false;
        }
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
        savedId = created.id;
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

      imagesOk = await persistSlots(savedId);

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
      if (!imagesOk) {
        toast({
          title: "Snapshots not saved",
          description:
            "The trade saved, but a snapshot couldn't be uploaded. Edit the trade to retry.",
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
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-lg border border-edge bg-surface"
          />
        ))}
      </div>
    );
  }

  // Only block the whole page when there's genuinely nothing to show. Kept
  // (unassigned) trades still render even after every account is deleted.
  if (accounts.length === 0 && trades.length === 0) {
    return (
      <EmptyState
        title="Create an account first"
        description="Every trade is logged against a trading account. Add your first account, then come back to start journaling."
        action={
          <Link
            href="/accounts"
            className="inline-flex h-11 select-none items-center justify-center gap-2 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-fg transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            Go to Accounts
          </Link>
        }
      />
    );
  }

  let content: ReactNode;
  if (trades.length === 0) {
    content = (
      <EmptyState
        title="Log your first trade"
        description="Pair, direction, prices, snapshots of the chart before and after — everything lives here, and the dashboard builds itself from what you log."
        action={
          <Button onClick={() => openCreate()}>
            <Plus className="size-4" aria-hidden="true" />
            Log trade
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:flex-wrap sm:gap-3">
          <FilterSelect
            aria-label="Filter by account"
            className="min-w-0 flex-1 sm:w-auto sm:flex-none"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
            {hasUnassigned && <option value="unassigned">No account</option>}
          </FilterSelect>
          <FilterSelect
            aria-label="Filter by status"
            className="min-w-0 flex-1 sm:w-auto sm:flex-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All trades</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </FilterSelect>

          <p className="hidden shrink-0 text-[13px] text-muted sm:block">
            {filtered.length} of {trades.length}
          </p>

          {accounts.length === 0 ? (
            <Link
              href="/accounts?new=1"
              className="inline-flex h-9 min-w-0 flex-1 select-none items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-fg transition-[background-color,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.98] sm:ml-auto sm:flex-none sm:px-3.5"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Add account</span>
            </Link>
          ) : (
            <Button
              size="sm"
              className="min-w-0 flex-1 sm:ml-auto sm:flex-none"
              onClick={() => openCreate()}
            >
              <Plus className="size-4" aria-hidden="true" />
              Log trade
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((trade) => {
            const cover = coverFor(trade);
            const duration = tradeDuration(trade);
            const pnl = trade.profit_loss;
            return (
              <article
                key={trade.id}
                className="group relative overflow-hidden rounded-lg border border-edge bg-surface transition-[border-color,transform] duration-150 ease-out hover:border-edge-strong"
              >
                <Link
                  href={`/trades/${trade.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`${trade.pair} ${trade.direction} trade, ${formatDate(trade.entry_time)}`}
                />

                {cover?.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.signedUrl}
                    alt=""
                    loading="lazy"
                    className="pointer-events-none aspect-video w-full border-b border-edge object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none flex aspect-video w-full flex-col items-center justify-center gap-1.5 border-b border-edge bg-wash text-faint"
                  >
                    <ChartCandlestick className="size-5" />
                    <span className="text-[12px]">No snapshot</span>
                  </div>
                )}

                <div className="pointer-events-none p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {trade.pair}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold uppercase tracking-[0.02em] ${
                          trade.direction === "Buy"
                            ? "text-positive"
                            : "text-negative"
                        }`}
                      >
                        {trade.direction === "Buy" ? (
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDownRight
                            className="size-3"
                            aria-hidden="true"
                          />
                        )}
                        {trade.direction === "Buy" ? "Long" : "Short"}
                      </span>
                      {!trade.account_id && (
                        <span className="shrink-0 rounded-full border border-edge bg-hover px-2 py-0.5 text-[11px] font-medium text-muted">
                          No account
                        </span>
                      )}
                    </span>
                    {trade.status === "Open" ? (
                      <span className="shrink-0 rounded-full border border-edge bg-hover px-2 py-0.5 text-[11px] font-medium text-muted">
                        Open
                      </span>
                    ) : pnl != null ? (
                      <span
                        className={`tabular shrink-0 text-[16px] font-semibold ${
                          pnl >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatMoney(pnl, trade.accounts?.currency ?? "USD")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-[12px] text-muted">
                    {formatDate(trade.entry_time)}
                    {trade.setups?.name && <> · {trade.setups.name}</>}
                    {trade.rr != null && (
                      <> · {trade.rr.toFixed(2)}R</>
                    )}
                    {duration && <> · {duration}</>}
                  </p>
                </div>

                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(trade)}
                    aria-label={`Edit ${trade.pair} trade`}
                    className="flex size-8 items-center justify-center rounded-md bg-scrim text-faint backdrop-blur-sm transition-colors duration-150 ease-out hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(trade)}
                    aria-label={`Delete ${trade.pair} trade`}
                    className="flex size-8 items-center justify-center rounded-md bg-scrim text-faint backdrop-blur-sm transition-colors duration-150 ease-out hover:text-negative"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}

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
                labelAccessory={
                  form.take_profit.trim() || form.stop_loss.trim() ? (
                    <span className="flex items-center gap-1">
                      {form.take_profit.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              exit_price: form.take_profit,
                            })
                          }
                          className="rounded border border-edge px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-150 ease-out hover:border-edge-strong hover:text-positive active:scale-[0.97]"
                        >
                          Use TP
                        </button>
                      )}
                      {form.stop_loss.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              exit_price: form.stop_loss,
                            })
                          }
                          className="rounded border border-edge px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-150 ease-out hover:border-edge-strong hover:text-negative active:scale-[0.97]"
                        >
                          Use SL
                        </button>
                      )}
                    </span>
                  ) : undefined
                }
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
              <div className="rounded-md bg-wash px-3 py-2 text-[13px]">
                <span className="text-muted">
                  {form.exit_price.trim() ? "Realized" : "Planned"} R multiple:{" "}
                  <span
                    className={`tabular font-semibold ${
                      liveRR >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {liveRR.toFixed(2)}R
                  </span>
                </span>
              </div>
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
                onChange={(e) => handleSetupChange(e.target.value)}
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

            {checklist.length > 0 && (
              <div className="rounded-md border border-edge bg-wash p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">
                    Setup checklist
                  </span>
                  <span className="tabular text-[12px] text-muted">
                    Followed {checklistScore(checklist).done}/
                    {checklistScore(checklist).total}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {CHECKLIST_SECTIONS.map((section) => {
                    const items = checklist
                      .map((item, index) => ({ item, index }))
                      .filter(({ item }) => item.section === section.key);
                    if (items.length === 0) return null;
                    return (
                      <div key={section.key}>
                        <p className="text-[12px] font-medium text-faint">
                          {section.heading}
                        </p>
                        <div className="mt-1.5 space-y-1">
                          {items.map(({ item, index }) => (
                            <label
                              key={index}
                              className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1 text-[14px] text-ink transition-colors duration-150 ease-out hover:bg-hover"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 shrink-0 accent-primary"
                                checked={item.checked}
                                onChange={() => toggleChecklistItem(index)}
                              />
                              <span
                                className={
                                  item.checked ? "" : "text-muted"
                                }
                              >
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <SnapshotSlot
                label="Pre-trade snapshot"
                slot={preSlot}
                disabled={saving}
                onPick={(file) => stageFile("pre", file)}
                onClear={() => clearSlot("pre")}
              />
              <SnapshotSlot
                label="Post-trade snapshot"
                slot={postSlot}
                disabled={saving}
                onPick={(file) => stageFile("post", file)}
                onClear={() => clearSlot("post")}
              />
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

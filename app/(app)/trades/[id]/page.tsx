"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { getTrade, type Trade } from "@/src/lib/trades";
import {
  deleteTradeImage,
  listTradeImages,
  tradeImageUrls,
  uploadTradeImage,
  type TradeImage,
  type TradeImageType,
} from "@/src/lib/trade-images";
import { listTagsForTrade, type Tag } from "@/src/lib/tags";
import { TagChip } from "@/src/components/ui/tag-chip";
import { formatMoney } from "@/src/lib/format";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { useToast } from "@/src/components/ui/toast";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const STAGES: {
  key: TradeImageType;
  label: string;
  hint: string;
}[] = [
  {
    key: "Before",
    label: "Before trade",
    hint: "Market context before the setup formed.",
  },
  { key: "Entry", label: "Entry", hint: "The chart at the moment you entered." },
  {
    key: "Management",
    label: "Management",
    hint: "How the position developed while it was open.",
  },
  { key: "Exit", label: "Exit", hint: "The chart when you closed the trade." },
  {
    key: "Markup",
    label: "Markup",
    hint: "Your annotated review, after the fact.",
  },
];

function stageLabel(type: TradeImageType): string {
  return STAGES.find((s) => s.key === type)?.label ?? type;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-faint">{label}</dt>
      <dd className="tabular mt-1 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [images, setImages] = useState<TradeImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const [uploadStage, setUploadStage] = useState<TradeImageType | null>(null);
  const [dragStage, setDragStage] = useState<TradeImageType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingStage = useRef<TradeImageType>("Before");

  const [lightbox, setLightbox] = useState<TradeImage | null>(null);
  const [removing, setRemoving] = useState<TradeImage | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.all([getTrade(id), listTradeImages(id), listTagsForTrade(id)])
      .then(async ([tradeData, imageData, tagData]) => {
        if (cancelled) return;
        setTrade(tradeData);
        setImages(imageData);
        setTags(tagData);
        const signed = await tradeImageUrls(
          imageData.map((i) => i.image_url),
        );
        if (!cancelled) setUrls(signed);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load this trade",
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
  }, [id, toast]);

  async function handleUpload(stage: TradeImageType, file: File) {
    if (!user || !trade) return;
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

    setUploadStage(stage);
    try {
      const image = await uploadTradeImage(user.id, trade.id, stage, file);
      const signed = await tradeImageUrls([image.image_url]);
      setImages((current) => [...current, image]);
      setUrls((current) => ({ ...current, ...signed }));
      toast({ title: "Chart added", variant: "success" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          (error as { message?: string })?.message ??
          "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setUploadStage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function pickFile(stage: TradeImageType) {
    pendingStage.current = stage;
    fileInputRef.current?.click();
  }

  function handleDrop(stage: TradeImageType, event: DragEvent) {
    event.preventDefault();
    setDragStage(null);
    const file = event.dataTransfer.files?.[0];
    if (file) handleUpload(stage, file);
  }

  async function handleRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await deleteTradeImage(removing);
      setImages((current) => current.filter((i) => i.id !== removing.id));
      setRemoving(null);
      toast({ title: "Chart removed", variant: "success" });
    } catch {
      toast({
        title: "Couldn't remove the chart",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setRemoveBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6" aria-hidden="true">
        <div className="h-24 animate-pulse rounded-lg border border-edge bg-surface" />
        <div className="h-48 animate-pulse rounded-lg border border-edge bg-surface" />
      </div>
    );
  }

  if (!trade) {
    return (
      <EmptyState
        title="Trade not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Link
            href="/trades"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-edge-strong px-3 text-[13px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-raised"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back to trades
          </Link>
        }
      />
    );
  }

  const currency = trade.accounts?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trades"
          className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors duration-150 ease-out hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Trades
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                {trade.pair}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[14px] text-muted">
                {trade.direction === "Buy" ? (
                  <ArrowUpRight
                    className="size-4 text-positive"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownRight
                    className="size-4 text-negative"
                    aria-hidden="true"
                  />
                )}
                {trade.direction === "Buy" ? "Buy" : "Sell"}
              </span>
              {trade.status === "Open" ? (
                <Badge>Open</Badge>
              ) : (
                <Badge variant="neutral">{trade.status}</Badge>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {formatDateTime(trade.entry_time)}
              {trade.exit_time && ` → ${formatDateTime(trade.exit_time)}`}
            </p>
          </div>

          {trade.status === "Closed" && trade.profit_loss != null && (
            <p
              className={`tabular text-2xl font-semibold tracking-[-0.01em] ${
                trade.profit_loss >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {trade.profit_loss >= 0 ? "+" : ""}
              {formatMoney(trade.profit_loss, currency)}
            </p>
          )}
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          <Fact label="Account">{trade.accounts?.account_name ?? "—"}</Fact>
          <Fact label="Setup">{trade.setups?.name ?? "—"}</Fact>
          <Fact label="Entry">{trade.entry_price}</Fact>
          <Fact label="Exit">{trade.exit_price ?? "—"}</Fact>
          <Fact label="Stop loss">{trade.stop_loss ?? "—"}</Fact>
          <Fact label="Take profit">{trade.take_profit ?? "—"}</Fact>
          <Fact label="R multiple">
            {trade.rr != null ? `${trade.rr.toFixed(2)}R` : "—"}
          </Fact>
          <Fact label="Lot size">{trade.lot_size ?? "—"}</Fact>
          <Fact label="Risk">
            {trade.risk_percent != null ? `${trade.risk_percent}%` : "—"}
          </Fact>
          <Fact label="Session">{trade.session ?? "—"}</Fact>
          <Fact label="Timeframe">{trade.timeframe ?? "—"}</Fact>
        </dl>
        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-edge pt-5">
            {tags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} />
            ))}
          </div>
        )}
      </Card>

      {trade.notes && (
        <Card title="Notes">
          <p className="max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {trade.notes}
          </p>
        </Card>
      )}

      <section className="space-y-8">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Charts
        </h2>

        {STAGES.map((stage) => {
          const stageImages = images.filter(
            (i) => i.image_type === stage.key,
          );
          return (
            <div
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragStage(stage.key);
              }}
              onDragLeave={() => setDragStage(null)}
              onDrop={(e) => handleDrop(stage.key, e)}
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">
                    {stage.label}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted">{stage.hint}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {stageImages.map((image) => (
                  <div key={image.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setLightbox(image)}
                      className="block w-full overflow-hidden rounded-md border border-edge bg-raised transition-[border-color,transform] duration-150 ease-out hover:border-edge-strong active:scale-[0.99]"
                      aria-label={`View ${stage.label} chart`}
                    >
                      {urls[image.image_url] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urls[image.image_url]}
                          alt={`${stage.label} chart for ${trade.pair}`}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="aspect-video w-full animate-pulse bg-raised" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(image)}
                      aria-label={`Remove ${stage.label} chart`}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-canvas/80 text-faint opacity-0 backdrop-blur-sm transition-[opacity,color] duration-150 ease-out focus-visible:opacity-100 group-hover:opacity-100 hover:text-negative"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {uploadStage === stage.key && (
                  <div
                    className="aspect-video animate-pulse rounded-md border border-edge bg-raised"
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  onClick={() => pickFile(stage.key)}
                  className={`flex aspect-video flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-[13px] transition-colors duration-150 ease-out ${
                    dragStage === stage.key
                      ? "border-accent/60 bg-white/5 text-ink"
                      : "border-edge-strong text-faint hover:border-accent/40 hover:text-muted"
                  }`}
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {dragStage === stage.key ? "Drop to upload" : "Add chart"}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Choose a chart screenshot"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(pendingStage.current, file);
        }}
      />

      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title={lightbox ? `${stageLabel(lightbox.image_type)} — ${trade.pair}` : ""}
        size="lg"
      >
        {lightbox && urls[lightbox.image_url] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urls[lightbox.image_url]}
            alt={`${stageLabel(lightbox.image_type)} chart for ${trade.pair}`}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        )}
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this chart?"
        description="The screenshot is deleted permanently."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRemoving(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={removeBusy}
              onClick={handleRemove}
            >
              Remove chart
            </Button>
          </>
        }
      />
    </div>
  );
}

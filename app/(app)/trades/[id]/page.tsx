"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartCandlestick,
  ChevronLeft,
} from "lucide-react";
import { getTrade, type Trade } from "@/src/lib/trades";
import {
  listTradeImages,
  pickSnapshot,
  tradeImageUrls,
  type TradeImage,
} from "@/src/lib/trade-images";
import { listTagsForTrade, type Tag } from "@/src/lib/tags";
import { TagChip } from "@/src/components/ui/tag-chip";
import { formatMoney } from "@/src/lib/format";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { useToast } from "@/src/components/ui/toast";

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
  const { toast } = useToast();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [images, setImages] = useState<TradeImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<{
    title: string;
    url: string;
  } | null>(null);

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
  const snapshots = [
    { title: "Pre-trade", image: pickSnapshot(images, "pre") },
    { title: "Post-trade", image: pickSnapshot(images, "post") },
  ];

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

      <div className="grid gap-4 lg:grid-cols-2">
        {snapshots.map(({ title, image }) => {
          const url = image ? urls[image.image_url] : null;
          return (
            <div key={title} className="min-w-0">
              <h3 className="text-[13px] font-medium text-muted">{title}</h3>
              {url ? (
                <button
                  type="button"
                  onClick={() => setLightbox({ title, url })}
                  className="relative mt-2 block aspect-video w-full overflow-hidden rounded-lg border border-edge transition-[border-color,transform] duration-150 ease-out hover:border-edge-strong active:scale-[0.995]"
                  aria-label={`View ${title} snapshot full size`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${title} snapshot for ${trade.pair}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                </button>
              ) : (
                <div className="mt-2 flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-edge text-faint">
                  <ChartCandlestick className="size-5" aria-hidden="true" />
                  <span className="text-[12px]">
                    Attach via Edit on the trade log
                  </span>
                </div>
              )}
            </div>
          );
        })}
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

      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title={lightbox ? `${lightbox.title} — ${trade.pair}` : ""}
        size="lg"
      >
        {lightbox && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightbox.url}
            alt={`${lightbox.title} snapshot for ${trade.pair}`}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        )}
      </Modal>
    </div>
  );
}

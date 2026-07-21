import { supabase } from "./supabase";

/** Stored values per the trade_images_image_type_check constraint. */
export type TradeImageType =
  | "Before"
  | "Entry"
  | "Management"
  | "Exit"
  | "Markup";

export type TradeImage = {
  id: string;
  trade_id: string;
  image_url: string;
  image_type: TradeImageType;
  created_at: string;
};

const BUCKET = "trade-images";

/** The two logging slots map onto the existing image_type constraint. */
export const PRE_TRADE_TYPE: TradeImageType = "Before";
export const POST_TRADE_TYPE: TradeImageType = "Exit";

/** Resolve a trade's pre/post snapshot, tolerating legacy stage values. */
export function pickSnapshot(
  images: TradeImage[],
  which: "pre" | "post",
): TradeImage | null {
  const order: TradeImageType[] =
    which === "pre" ? ["Before", "Entry"] : ["Exit", "Markup"];
  for (const type of order) {
    const matches = images.filter((i) => i.image_type === type);
    if (matches.length > 0) return matches[matches.length - 1];
  }
  return null;
}

/** All images for a set of trades in one query, keyed by trade id. */
export async function listImagesForTrades(
  tradeIds: string[],
): Promise<Record<string, TradeImage[]>> {
  if (tradeIds.length === 0) return {};
  const { data, error } = await supabase
    .from("trade_images")
    .select("*")
    .in("trade_id", tradeIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const map: Record<string, TradeImage[]> = {};
  for (const image of (data ?? []) as TradeImage[]) {
    (map[image.trade_id] ??= []).push(image);
  }
  return map;
}

export async function listTradeImages(
  tradeId: string,
): Promise<TradeImage[]> {
  const { data, error } = await supabase
    .from("trade_images")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function uploadTradeImage(
  userId: string,
  tradeId: string,
  type: TradeImageType,
  file: File,
): Promise<TradeImage> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/${tradeId}/${type}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("trade_images")
    .insert({ trade_id: tradeId, image_url: path, image_type: type })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned file behind if the row insert failed.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function deleteTradeImage(image: TradeImage): Promise<void> {
  const { error } = await supabase
    .from("trade_images")
    .delete()
    .eq("id", image.id);
  if (error) throw error;
  if (!/^https?:\/\//.test(image.image_url)) {
    // Best-effort file cleanup.
    await supabase.storage.from(BUCKET).remove([image.image_url]);
  }
}

/** Signed display URLs keyed by storage path (paths already holding full URLs pass through). */
export async function tradeImageUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  const toSign = paths.filter((p) => !/^https?:\/\//.test(p));
  for (const p of paths) {
    if (/^https?:\/\//.test(p)) urls[p] = p;
  }
  if (toSign.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(toSign, 60 * 60);
  if (error) throw error;
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

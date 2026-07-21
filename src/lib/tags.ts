import { supabase } from "./supabase";

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type TagWithCount = Tag & { trade_tags: { count: number }[] };

/** Preset swatches for tag colors (stored as hex). */
export const TAG_COLORS: { value: string; label: string }[] = [
  { value: "#8b7ff0", label: "Violet" },
  { value: "#6ea8f5", label: "Blue" },
  { value: "#4fd1b8", label: "Teal" },
  { value: "#52c98a", label: "Green" },
  { value: "#e8b750", label: "Amber" },
  { value: "#e89350", label: "Orange" },
  { value: "#e86a5f", label: "Red" },
  { value: "#e070b8", label: "Pink" },
];

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*, trade_tags(count)")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TagWithCount[];
}

export function tagUsage(tag: TagWithCount): number {
  return tag.trade_tags?.[0]?.count ?? 0;
}

export async function createTag(
  userId: string,
  name: string,
  color: string | null,
): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTag(
  id: string,
  fields: { name: string; color: string | null },
): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

export async function listTradeTagIds(tradeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("trade_tags")
    .select("tag_id")
    .eq("trade_id", tradeId);
  if (error) throw error;
  return (data ?? []).map((row) => row.tag_id);
}

export async function setTradeTags(
  tradeId: string,
  tagIds: string[],
): Promise<void> {
  const current = await listTradeTagIds(tradeId);
  const toAdd = tagIds.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !tagIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("trade_tags")
      .insert(toAdd.map((tagId) => ({ trade_id: tradeId, tag_id: tagId })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("trade_tags")
      .delete()
      .eq("trade_id", tradeId)
      .in("tag_id", toRemove);
    if (error) throw error;
  }
}

export async function listTagsForTrade(tradeId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("trade_tags")
    .select("tags(*)")
    .eq("trade_id", tradeId);
  if (error) throw error;
  return ((data ?? []) as unknown as { tags: Tag | null }[])
    .map((row) => row.tags)
    .filter((tag): tag is Tag => tag != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

import { supabase } from "./supabase";

export type JournalEntry = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  created_at: string;
  updated_at: string | null;
};

export const MOODS: { value: string; label: string; emoji: string }[] = [
  { value: "confident", label: "Confident", emoji: "😎" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "anxious", label: "Anxious", emoji: "😬" },
  { value: "tilted", label: "Tilted", emoji: "🤯" },
];

export function moodMeta(value: string | null) {
  return MOODS.find((m) => m.value === value) ?? null;
}

/** The four journal sections, stored inside `content` under markdown headings. */
export const JOURNAL_SECTIONS = [
  { key: "bias", heading: "Market bias" },
  { key: "thoughts", heading: "Thoughts" },
  { key: "psychology", heading: "Psychology" },
  { key: "lessons", heading: "Lessons" },
] as const;

export type SectionKey = (typeof JOURNAL_SECTIONS)[number]["key"];
export type Sections = Record<SectionKey, string>;

export function emptySections(): Sections {
  return { bias: "", thoughts: "", psychology: "", lessons: "" };
}

export function serializeSections(sections: Sections): string | null {
  const parts = JOURNAL_SECTIONS.filter(
    (s) => sections[s.key].trim() !== "",
  ).map((s) => `## ${s.heading}\n\n${sections[s.key].trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function parseSections(content: string | null): Sections {
  const result = emptySections();
  if (!content) return result;

  const pattern = /^## (.+)$/gm;
  const matches = [...content.matchAll(pattern)];
  if (matches.length === 0) {
    // Legacy/free-form content lands in Thoughts.
    result.thoughts = content.trim();
    return result;
  }

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim().toLowerCase();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end =
      i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(start, end).trim();
    const section = JOURNAL_SECTIONS.find(
      (s) => s.heading.toLowerCase() === heading,
    );
    if (section) result[section.key] = body;
    else result.thoughts = result.thoughts
      ? `${result.thoughts}\n\n${body}`
      : body;
  }
  return result;
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createJournalEntry(
  userId: string,
  fields: { title: string | null; content: string | null; mood: string | null },
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(
  id: string,
  fields: { title: string | null; content: string | null; mood: string | null },
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * A setup's checklist is authored as three sections, stored in the single
 * `setups.description` column under markdown headings (one item per line).
 * When a trade is logged with that setup, the ticked state is stored as a
 * self-contained block appended to `trades.notes`, so each trade records
 * exactly the checklist it was logged against.
 */

export const CHECKLIST_SECTIONS = [
  { key: "entry", heading: "Entry" },
  { key: "confirmations", heading: "Confirmations" },
  { key: "invalidation", heading: "Invalidation" },
] as const;

export type SectionKey = (typeof CHECKLIST_SECTIONS)[number]["key"];
export type ChecklistSections = Record<SectionKey, string[]>;

export type ChecklistItem = {
  section: SectionKey;
  text: string;
  checked: boolean;
};

const NOTES_MARKER = "[[checklist]]";

export function emptySections(): ChecklistSections {
  return { entry: [], confirmations: [], invalidation: [] };
}

function headingToKey(heading: string): SectionKey | null {
  const match = CHECKLIST_SECTIONS.find(
    (s) => s.heading.toLowerCase() === heading.trim().toLowerCase(),
  );
  return match?.key ?? null;
}

/** Split a textarea's value into non-empty, trimmed lines (checklist items). */
export function linesToItems(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*☐☑\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

// ---- Setup template (setups.description) ----

export function parseSetupChecklist(
  description: string | null,
): ChecklistSections {
  const sections = emptySections();
  if (!description) return sections;

  const lines = description.split("\n");
  let current: SectionKey | null = null;
  let sawHeading = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      sawHeading = true;
      current = headingToKey(line.slice(3));
      continue;
    }
    if (!line) continue;
    const item = line.replace(/^[-*]\s+/, "").trim();
    if (current) sections[current].push(item);
    else if (!sawHeading) sections.entry.push(item); // legacy free-text
  }
  return sections;
}

export function serializeSetupChecklist(
  sections: ChecklistSections,
): string | null {
  const parts = CHECKLIST_SECTIONS.filter(
    (s) => sections[s.key].length > 0,
  ).map(
    (s) =>
      `## ${s.heading}\n${sections[s.key].map((i) => `- ${i}`).join("\n")}`,
  );
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function sectionsToItems(sections: ChecklistSections): ChecklistItem[] {
  return CHECKLIST_SECTIONS.flatMap((s) =>
    sections[s.key].map((text) => ({
      section: s.key,
      text,
      checked: false,
    })),
  );
}

export function countItems(sections: ChecklistSections): number {
  return (
    sections.entry.length +
    sections.confirmations.length +
    sections.invalidation.length
  );
}

// ---- Trade notes (trades.notes) ----

export function parseTradeNotes(notes: string | null): {
  prose: string;
  checklist: ChecklistItem[];
} {
  if (!notes) return { prose: "", checklist: [] };
  const idx = notes.indexOf(NOTES_MARKER);
  if (idx === -1) return { prose: notes, checklist: [] };

  const prose = notes.slice(0, idx).trimEnd();
  const block = notes.slice(idx + NOTES_MARKER.length);

  const checklist: ChecklistItem[] = [];
  let current: SectionKey | null = null;
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      current = headingToKey(line.slice(3));
      continue;
    }
    const match = line.match(/^\[([ xX])\]\s+(.*)$/);
    if (match && current) {
      checklist.push({
        section: current,
        text: match[2].trim(),
        checked: match[1].toLowerCase() === "x",
      });
    }
  }
  return { prose, checklist };
}

export function serializeTradeNotes(
  prose: string,
  checklist: ChecklistItem[],
): string | null {
  const trimmedProse = prose.trim();
  if (checklist.length === 0) return trimmedProse || null;

  const grouped = CHECKLIST_SECTIONS.map((s) => {
    const items = checklist.filter((i) => i.section === s.key);
    if (items.length === 0) return null;
    return `## ${s.heading}\n${items
      .map((i) => `[${i.checked ? "x" : " "}] ${i.text}`)
      .join("\n")}`;
  }).filter((block): block is string => block !== null);

  const block = `${NOTES_MARKER}\n${grouped.join("\n")}`;
  return trimmedProse ? `${trimmedProse}\n\n${block}` : block;
}

export function checklistScore(checklist: ChecklistItem[]): {
  done: number;
  total: number;
} {
  return {
    done: checklist.filter((i) => i.checked).length,
    total: checklist.length,
  };
}

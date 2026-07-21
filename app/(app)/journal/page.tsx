"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  createJournalEntry,
  deleteJournalEntry,
  emptySections,
  JOURNAL_SECTIONS,
  listJournalEntries,
  MOODS,
  moodMeta,
  parseSections,
  serializeSections,
  updateJournalEntry,
  type JournalEntry,
  type Sections,
} from "@/src/lib/journal";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { TextField } from "@/src/components/ui/text-field";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";

const SECTION_PLACEHOLDERS: Record<string, string> = {
  bias: "Directional read, key levels, news to respect…",
  thoughts: "What you saw, what you did, how the plan held up…",
  psychology: "State of mind, urges, discipline — the honest version…",
  lessons: "What tomorrow's you should remember…",
};

function defaultTitle(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function entryDate(entry: JournalEntry): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(entry.created_at));
}

export default function JournalPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [sections, setSections] = useState<Sections>(emptySections());
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<JournalEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listJournalEntries()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your journal",
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
    setTitle(defaultTitle());
    setMood(null);
    setSections(emptySections());
    setFormOpen(true);
  }

  function openEdit(entry: JournalEntry) {
    setEditing(entry);
    setTitle(entry.title ?? "");
    setMood(entry.mood);
    setSections(parseSections(entry.content));
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const content = serializeSections(sections);
    if (!content) {
      toast({
        title: "Nothing to save yet",
        description: "Write something in at least one section.",
        variant: "info",
      });
      return;
    }

    setSaving(true);
    const fields = {
      title: title.trim() || null,
      content,
      mood,
    };
    try {
      if (editing) {
        const updated = await updateJournalEntry(editing.id, fields);
        setEntries((current) =>
          current.map((e) => (e.id === updated.id ? updated : e)),
        );
        toast({ title: "Entry updated", variant: "success" });
      } else {
        const created = await createJournalEntry(user.id, fields);
        setEntries((current) => [created, ...current]);
        toast({ title: "Entry saved", variant: "success" });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing
          ? "Couldn't update the entry"
          : "Couldn't save the entry",
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
      await deleteJournalEntry(deleting.id);
      setEntries((current) => current.filter((e) => e.id !== deleting.id));
      toast({ title: "Entry deleted", variant: "success" });
      setDeleting(null);
    } catch {
      toast({
        title: "Couldn't delete the entry",
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
        className="h-64 animate-pulse rounded-lg border border-edge bg-surface"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {entries.length === 0 ? (
        <EmptyState
          title="Start today's entry"
          description="Bias before the session, honest psychology during it, lessons after. The journal is where trades turn into skill."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New entry
            </Button>
          }
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] text-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New entry
            </Button>
          </div>

          <div className="space-y-4">
            {entries.map((entry) => {
              const parsed = parseSections(entry.content);
              const meta = moodMeta(entry.mood);
              return (
                <article
                  key={entry.id}
                  className="group rounded-lg border border-edge bg-surface p-5"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                        {entry.title || entryDate(entry)}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-2 text-[12px] text-faint">
                        {entryDate(entry)}
                        {meta && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-edge px-2 py-0.5 text-[11px] text-muted">
                            <span aria-hidden="true">{meta.emoji}</span>
                            {meta.label}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        aria-label="Edit entry"
                        className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(entry)}
                        aria-label="Delete entry"
                        className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-negative/10 hover:text-negative"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </header>

                  <div className="mt-4 space-y-4">
                    {JOURNAL_SECTIONS.filter(
                      (s) => parsed[s.key].trim() !== "",
                    ).map((s) => (
                      <div key={s.key}>
                        <h3 className="text-[12px] font-medium text-faint">
                          {s.heading}
                        </h3>
                        <p className="mt-1 max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                          {parsed[s.key]}
                        </p>
                      </div>
                    ))}
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
        title={editing ? "Edit entry" : "New journal entry"}
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
            <Button
              type="submit"
              form="journal-form"
              size="sm"
              loading={saving}
            >
              {editing ? "Save changes" : "Save entry"}
            </Button>
          </>
        }
      >
        <form id="journal-form" onSubmit={handleSubmit} className="space-y-5">
          <TextField
            label="Title"
            placeholder={defaultTitle()}
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <span className="block text-[13px] font-medium text-muted">
              Mood
            </span>
            <div
              role="radiogroup"
              aria-label="Mood"
              className="mt-2 flex flex-wrap gap-2"
            >
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mood === m.value}
                  onClick={() =>
                    setMood(mood === m.value ? null : m.value)
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-150 ease-out active:scale-[0.98] ${
                    mood === m.value
                      ? "border-accent/60 bg-white/10 text-ink"
                      : "border-edge text-muted hover:border-edge-strong hover:text-ink"
                  }`}
                >
                  <span aria-hidden="true">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {JOURNAL_SECTIONS.map((s) => (
            <Textarea
              key={s.key}
              label={s.heading}
              rows={3}
              placeholder={SECTION_PLACEHOLDERS[s.key]}
              value={sections[s.key]}
              onChange={(e) =>
                setSections({ ...sections, [s.key]: e.target.value })
              }
            />
          ))}
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this entry?"
        description="The entry is removed permanently."
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
              Delete entry
            </Button>
          </>
        }
      />
    </>
  );
}

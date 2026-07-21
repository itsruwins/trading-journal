"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  createTag,
  deleteTag,
  listTagsWithCounts,
  tagUsage,
  updateTag,
  TAG_COLORS,
  type TagWithCount,
} from "@/src/lib/tags";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { TagChip } from "@/src/components/ui/tag-chip";
import { TextField } from "@/src/components/ui/text-field";
import { useToast } from "@/src/components/ui/toast";
import { Table, TBody, TD, TH, THead, TR } from "@/src/components/ui/table";

const SUGGESTIONS: { name: string; color: string }[] = [
  { name: "A+", color: "#52c98a" },
  { name: "FOMO", color: "#e8b750" },
  { name: "Revenge", color: "#e86a5f" },
  { name: "London", color: "#6ea8f5" },
  { name: "NY Session", color: "#8b7ff0" },
];

export default function TagsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TagWithCount | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<TagWithCount | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTagsWithCounts()
      .then((data) => {
        if (!cancelled) setTags(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your tags",
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
    setColor(null);
    setNameError(null);
    setFormOpen(true);
  }

  function openEdit(tag: TagWithCount) {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
    setNameError(null);
    setFormOpen(true);
  }

  async function quickAdd(suggestion: { name: string; color: string }) {
    if (!user) return;
    setQuickAdding(suggestion.name);
    try {
      const created = await createTag(
        user.id,
        suggestion.name,
        suggestion.color,
      );
      setTags((current) =>
        [...current, { ...created, trade_tags: [] }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      toast({ title: `“${suggestion.name}” added`, variant: "success" });
    } catch {
      toast({
        title: "Couldn't add the tag",
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
      setNameError("Give the tag a name.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTag(editing.id, {
          name: trimmed,
          color,
        });
        setTags((current) =>
          current
            .map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast({ title: "Tag updated", variant: "success" });
      } else {
        const created = await createTag(user.id, trimmed, color);
        setTags((current) =>
          [...current, { ...created, trade_tags: [] }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        toast({ title: "Tag created", variant: "success" });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing ? "Couldn't update the tag" : "Couldn't create the tag",
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
      await deleteTag(deleting.id);
      setTags((current) => current.filter((t) => t.id !== deleting.id));
      toast({ title: "Tag deleted", variant: "success" });
      setDeleting(null);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast({
        title: "Couldn't delete the tag",
        description:
          code === "23503"
            ? "Trades still use this tag. Remove it from those trades first."
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
    (s) => !tags.some((t) => t.name.toLowerCase() === s.name.toLowerCase()),
  );

  return (
    <>
      {tags.length === 0 ? (
        <EmptyState
          title="Label the story behind each trade"
          description="Tags capture what setups can't — discipline, mistakes, context. Tag trades as you log them, then filter your analytics by what really happened."
          action={
            <div className="flex flex-col items-center gap-4">
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    disabled={quickAdding !== null}
                    onClick={() => quickAdd(s)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-edge px-3 text-[13px] text-muted transition-colors duration-150 ease-out hover:border-accent/40 hover:text-ink active:scale-[0.98] disabled:opacity-50"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    {quickAdding === s.name ? "Adding…" : s.name}
                  </button>
                ))}
              </div>
              <Button onClick={openCreate}>New tag</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] text-muted">
              {tags.length} {tags.length === 1 ? "tag" : "tags"}
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New tag
            </Button>
          </div>

          <section className="overflow-hidden rounded-lg border border-edge bg-surface">
            <Table>
              <THead>
                <TR>
                  <TH>Tag</TH>
                  <TH numeric>Trades tagged</TH>
                  <TH aria-label="Actions" />
                </TR>
              </THead>
              <TBody>
                {tags.map((tag) => (
                  <TR key={tag.id}>
                    <TD>
                      <TagChip name={tag.name} color={tag.color} />
                    </TD>
                    <TD numeric className="text-muted">
                      {tagUsage(tag)}
                    </TD>
                    <TD className="w-0">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(tag)}
                          aria-label={`Edit ${tag.name}`}
                          className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(tag)}
                          aria-label={`Delete ${tag.name}`}
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

          {remainingSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-faint">Quick add:</span>
              {remainingSuggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  disabled={quickAdding !== null}
                  onClick={() => quickAdd(s)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-edge px-2.5 text-[12px] text-muted transition-colors duration-150 ease-out hover:border-accent/40 hover:text-ink active:scale-[0.98] disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {quickAdding === s.name ? "Adding…" : s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit tag" : "New tag"}
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
            <Button type="submit" form="tag-form" size="sm" loading={saving}>
              {editing ? "Save changes" : "Create tag"}
            </Button>
          </>
        }
      >
        <form id="tag-form" onSubmit={handleSubmit} className="space-y-5">
          <TextField
            label="Name"
            placeholder="e.g. A+"
            maxLength={40}
            required
            error={nameError ?? undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
          />
          <div>
            <span className="block text-[13px] font-medium text-muted">
              Color
            </span>
            <div
              role="radiogroup"
              aria-label="Tag color"
              className="mt-2 flex flex-wrap gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={color === null}
                aria-label="No color"
                onClick={() => setColor(null)}
                className={`flex size-8 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
                  color === null
                    ? "border-accent/60 bg-white/10"
                    : "border-edge hover:border-edge-strong"
                }`}
              >
                <span className="size-3.5 rounded-full bg-faint/40" />
              </button>
              {TAG_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={color === preset.value}
                  aria-label={preset.label}
                  onClick={() => setColor(preset.value)}
                  className={`flex size-8 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
                    color === preset.value
                      ? "border-accent/60 bg-white/10"
                      : "border-edge hover:border-edge-strong"
                  }`}
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-full"
                    style={{ background: preset.value }}
                  >
                    {color === preset.value && (
                      <Check
                        className="size-2.5 text-black/70"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {name.trim() && (
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-faint">Preview:</span>
              <TagChip name={name.trim()} color={color} />
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? "tag"}?`}
        description="The tag is removed from every trade that uses it."
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
              Delete tag
            </Button>
          </>
        }
      />
    </>
  );
}

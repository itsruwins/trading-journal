"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import {
  createReview,
  currentMonth,
  currentWeek,
  deleteReview,
  listReviews,
  parseLessons,
  periodLabel,
  serializeLessons,
  updateReview,
  type Review,
  type ReviewPeriod,
} from "@/src/lib/reviews";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Modal } from "@/src/components/ui/modal";
import { TextField } from "@/src/components/ui/text-field";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";

type PeriodFilter = "all" | ReviewPeriod;

export default function ReviewsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<PeriodFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [period, setPeriod] = useState<ReviewPeriod>("Weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState("");
  const [goals, setGoals] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [lessons, setLessons] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Review | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listReviews()
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your reviews",
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

  const filtered = useMemo(
    () => reviews.filter((r) => filter === "all" || r.period === filter),
    [reviews, filter],
  );

  function applyPeriodDates(next: ReviewPeriod) {
    setPeriod(next);
    const range = next === "Weekly" ? currentWeek() : currentMonth();
    setStartDate(range.start);
    setEndDate(range.end);
  }

  function openCreate() {
    setEditing(null);
    applyPeriodDates("Weekly");
    setSummary("");
    setGoals("");
    setMistakes("");
    setLessons("");
    setDateError(null);
    setFormOpen(true);
  }

  function openEdit(review: Review) {
    setEditing(review);
    setPeriod(review.period);
    setStartDate(review.start_date);
    setEndDate(review.end_date);
    setSummary(review.summary ?? "");
    setGoals(review.goals ?? "");
    const parsed = parseLessons(review.lessons);
    setMistakes(parsed.mistakes);
    setLessons(parsed.lessons);
    setDateError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (!startDate || !endDate) {
      setDateError("Set the period's start and end dates.");
      return;
    }
    if (endDate < startDate) {
      setDateError("The end date is before the start date.");
      return;
    }

    setSaving(true);
    const input = {
      period,
      start_date: startDate,
      end_date: endDate,
      summary: summary.trim() || null,
      goals: goals.trim() || null,
      lessons: serializeLessons(mistakes, lessons),
    };
    try {
      if (editing) {
        const updated = await updateReview(editing.id, input);
        setReviews((current) =>
          current.map((r) => (r.id === updated.id ? updated : r)),
        );
        toast({ title: "Review updated", variant: "success" });
      } else {
        const created = await createReview(user.id, input);
        setReviews((current) =>
          [created, ...current].sort((a, b) =>
            b.start_date.localeCompare(a.start_date),
          ),
        );
        toast({ title: "Review saved", variant: "success" });
      }
      setFormOpen(false);
    } catch (error) {
      toast({
        title: editing
          ? "Couldn't update the review"
          : "Couldn't save the review",
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
      await deleteReview(deleting.id);
      setReviews((current) => current.filter((r) => r.id !== deleting.id));
      toast({ title: "Review deleted", variant: "success" });
      setDeleting(null);
    } catch {
      toast({
        title: "Couldn't delete the review",
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

  const filterChip = (active: boolean): string =>
    `h-8 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ease-out ${
      active
        ? "bg-white/10 text-ink"
        : "text-muted hover:bg-white/5 hover:text-ink"
    }`;

  const sections = (review: Review) => {
    const parsed = parseLessons(review.lessons);
    return [
      { heading: "Summary", body: review.summary ?? "" },
      { heading: "Goals", body: review.goals ?? "" },
      { heading: "Mistakes", body: parsed.mistakes },
      { heading: "Lessons", body: parsed.lessons },
    ].filter((s) => s.body.trim() !== "");
  };

  return (
    <>
      {reviews.length === 0 ? (
        <EmptyState
          title="Close the loop on your weeks"
          description="A review turns a pile of trades into a verdict: what worked, what you broke, what changes next week. Weekly for rhythm, monthly for direction."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New review
            </Button>
          }
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="radiogroup"
              aria-label="Filter by period"
              className="flex rounded-md border border-edge bg-surface p-0.5"
            >
              {(["all", "Weekly", "Monthly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={filter === f}
                  onClick={() => setFilter(f)}
                  className={filterChip(filter === f)}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New review
            </Button>
          </div>

          <div className="space-y-4">
            {filtered.map((review) => (
              <article
                key={review.id}
                className="group rounded-lg border border-edge bg-surface p-5"
              >
                <header className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                      {periodLabel(review)}
                    </h2>
                    <Badge>{review.period}</Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(review)}
                      aria-label="Edit review"
                      className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(review)}
                      aria-label="Delete review"
                      className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-negative/10 hover:text-negative"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div className="mt-4 space-y-4">
                  {sections(review).map((s) => (
                    <div key={s.heading}>
                      <h3 className="text-[12px] font-medium text-faint">
                        {s.heading}
                      </h3>
                      <p className="mt-1 max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                        {s.body}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-[14px] text-muted">
                No {filter.toLowerCase()} reviews yet.
              </p>
            )}
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit review" : "New review"}
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
              form="review-form"
              size="sm"
              loading={saving}
            >
              {editing ? "Save changes" : "Save review"}
            </Button>
          </>
        }
      >
        <form id="review-form" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="block text-[13px] font-medium text-muted">
              Period
            </span>
            <div
              role="radiogroup"
              aria-label="Review period"
              className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-edge bg-surface p-1"
            >
              {(["Weekly", "Monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={period === p}
                  onClick={() => applyPeriodDates(p)}
                  className={`h-9 rounded-sm text-[14px] font-medium transition-colors duration-150 ease-out active:scale-[0.99] ${
                    period === p
                      ? "bg-white/10 text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="From"
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (dateError) setDateError(null);
              }}
            />
            <TextField
              label="To"
              type="date"
              required
              error={dateError ?? undefined}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (dateError) setDateError(null);
              }}
            />
          </div>

          <Textarea
            label="Summary"
            rows={3}
            placeholder="The period in a few honest sentences — results, conditions, execution…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <Textarea
            label="Goals"
            rows={3}
            placeholder="What you're committing to next period — specific and checkable…"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
          <Textarea
            label="Mistakes"
            rows={3}
            placeholder="Rule breaks, oversights, avoidable losses…"
            value={mistakes}
            onChange={(e) => setMistakes(e.target.value)}
          />
          <Textarea
            label="Lessons"
            rows={3}
            placeholder="What this period taught you…"
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this review?"
        description="The review is removed permanently."
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
              Delete review
            </Button>
          </>
        }
      />
    </>
  );
}

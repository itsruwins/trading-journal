import { supabase } from "./supabase";

export type ReviewPeriod = "Weekly" | "Monthly";

export type Review = {
  id: string;
  user_id: string;
  period: ReviewPeriod;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  summary: string | null;
  goals: string | null;
  lessons: string | null;
  created_at: string;
};

export type ReviewInput = {
  period: ReviewPeriod;
  start_date: string;
  end_date: string;
  summary: string | null;
  goals: string | null;
  lessons: string | null;
};

/** Mistakes and lessons share the `lessons` column under markdown headings. */
export function serializeLessons(
  mistakes: string,
  lessons: string,
): string | null {
  const parts: string[] = [];
  if (mistakes.trim()) parts.push(`## Mistakes\n\n${mistakes.trim()}`);
  if (lessons.trim()) parts.push(`## Lessons\n\n${lessons.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function parseLessons(stored: string | null): {
  mistakes: string;
  lessons: string;
} {
  if (!stored) return { mistakes: "", lessons: "" };
  const mistakesMatch = stored.match(
    /## Mistakes\n\n([\s\S]*?)(?=\n\n## |$)/,
  );
  const lessonsMatch = stored.match(/## Lessons\n\n([\s\S]*?)(?=\n\n## |$)/);
  if (!mistakesMatch && !lessonsMatch) {
    return { mistakes: "", lessons: stored.trim() };
  }
  return {
    mistakes: mistakesMatch?.[1].trim() ?? "",
    lessons: lessonsMatch?.[1].trim() ?? "",
  };
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday–Sunday of the current week. */
export function currentWeek(): { start: string; end: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}

export function currentMonth(): { start: string; end: string } {
  const now = new Date();
  return {
    start: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function periodLabel(review: Review): string {
  const start = new Date(`${review.start_date}T12:00:00`);
  const end = new Date(`${review.end_date}T12:00:00`);
  if (review.period === "Monthly") {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(start);
  }
  const fmt = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export async function listReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function createReview(
  userId: string,
  input: ReviewInput,
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({ user_id: userId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}

export async function updateReview(
  id: string,
  input: ReviewInput,
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

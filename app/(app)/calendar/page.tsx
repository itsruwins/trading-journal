import { EmptyState } from "@/src/components/ui/empty-state";

export default function CalendarPage() {
  return (
    <EmptyState
      title="Your trading calendar"
      description="A month-by-month view of daily P&L and activity. It starts filling in the moment trades are logged."
    />
  );
}

import { EmptyState } from "@/src/components/ui/empty-state";

export default function DashboardPage() {
  return (
    <EmptyState
      title="No trades to analyze yet"
      description="Log your first trade and this dashboard fills in — P&L, win rate, profit factor, your equity curve, and a calendar of your trading days."
    />
  );
}

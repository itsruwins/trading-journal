import { supabase } from "./supabase";

/** Stored values per the database check constraints (capitalized). */
export type TradeDirection = "Buy" | "Sell";
export type TradeStatus = "Open" | "Closed" | "Cancelled";

export type Trade = {
  id: string;
  user_id: string;
  account_id: string | null; // null once its account is deleted-and-kept
  setup_id: string | null;
  pair: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number | null;
  risk_percent: number | null;
  session: string | null;
  timeframe: string | null;
  notes: string | null;
  profit_loss: number | null;
  rr: number | null;
  status: TradeStatus;
  entry_time: string;
  exit_time: string | null;
  created_at: string;
  updated_at: string | null;
  setups: { name: string } | null;
  accounts: { account_name: string; currency: string } | null;
};

export type TradeInput = Omit<
  Trade,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "setups"
  | "accounts"
>;

const TRADE_SELECT = "*, setups(name), accounts(account_name, currency)";

export async function getTrade(id: string): Promise<Trade | null> {
  const { data, error } = await supabase
    .from("trades")
    .select(TRADE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Trade | null;
}

export async function listTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select(TRADE_SELECT)
    .order("entry_time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Trade[];
}

export async function createTrade(
  userId: string,
  input: TradeInput,
): Promise<Trade> {
  const { data, error } = await supabase
    .from("trades")
    .insert({ user_id: userId, ...input })
    .select(TRADE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Trade;
}

export async function updateTrade(
  id: string,
  input: TradeInput,
): Promise<Trade> {
  const { data, error } = await supabase
    .from("trades")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(TRADE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Trade;
}

export async function deleteTrade(id: string): Promise<void> {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}

/**
 * R multiple relative to the initial risk (entry → stop).
 * `target` is the exit for realized RR, or the take-profit for planned RR.
 */
export function computeRR(
  direction: TradeDirection,
  entry: number | null,
  stop: number | null,
  target: number | null,
): number | null {
  if (entry == null || stop == null || target == null) return null;
  const risk = direction === "Buy" ? entry - stop : stop - entry;
  const reward = direction === "Buy" ? target - entry : entry - target;
  if (risk <= 0) return null;
  return Math.round((reward / risk) * 100) / 100;
}

/** Realized P&L of a trade, counting only closed trades. */
export function realizedPnl(trade: {
  status: TradeStatus;
  profit_loss: number | null;
}): number {
  return trade.status === "Closed" && trade.profit_loss != null
    ? trade.profit_loss
    : 0;
}

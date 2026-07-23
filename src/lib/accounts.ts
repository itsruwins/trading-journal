import { supabase } from "./supabase";

export type Account = {
  id: string;
  user_id: string;
  account_name: string;
  broker: string | null;
  account_type: string | null;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type AccountInput = {
  account_name: string;
  broker: string | null;
  account_type: string | null;
  initial_balance: number;
  currency: string;
  is_active?: boolean;
};

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAccount(
  userId: string,
  input: AccountInput,
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      ...input,
      current_balance: input.initial_balance,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(
  account: Account,
  input: AccountInput,
): Promise<Account> {
  // Keep accumulated P&L intact when the starting balance is corrected.
  const balanceDelta = input.initial_balance - account.initial_balance;
  const { data, error } = await supabase
    .from("accounts")
    .update({
      ...input,
      current_balance: account.current_balance + balanceDelta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

/** How many trades are logged against an account. */
export async function countTradesForAccount(
  accountId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete an account and every trade logged against it — including each
 * trade's tags, image rows, and stored screenshots. Children are removed
 * first so it works whether or not the schema cascades.
 */
export async function deleteAccountAndTrades(
  accountId: string,
): Promise<void> {
  const { data: trades, error } = await supabase
    .from("trades")
    .select("id")
    .eq("account_id", accountId);
  if (error) throw error;

  const ids = (trades ?? []).map((t) => t.id);
  if (ids.length > 0) {
    await supabase.from("trade_tags").delete().in("trade_id", ids);

    const { data: images } = await supabase
      .from("trade_images")
      .select("image_url")
      .in("trade_id", ids);
    const paths = (images ?? [])
      .map((i) => i.image_url as string)
      .filter((p) => !/^https?:\/\//.test(p));
    if (paths.length > 0) {
      await supabase.storage.from("trade-images").remove(paths);
    }
    await supabase.from("trade_images").delete().in("trade_id", ids);

    const { error: tradesError } = await supabase
      .from("trades")
      .delete()
      .in("id", ids);
    if (tradesError) throw tradesError;
  }

  const { error: accountError } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);
  if (accountError) throw accountError;
}

/**
 * Delete an account but keep its trades, unassigning them (account_id → null).
 * Throws a NOT NULL violation (23502) if the schema requires an account.
 */
export async function unassignTradesAndDeleteAccount(
  accountId: string,
): Promise<void> {
  const { error } = await supabase
    .from("trades")
    .update({ account_id: null })
    .eq("account_id", accountId);
  if (error) throw error;

  const { error: accountError } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);
  if (accountError) throw accountError;
}

/** Shift an account's current balance by a realized P&L delta. */
export async function adjustAccountBalance(
  accountId: string | null,
  delta: number,
): Promise<void> {
  if (!accountId || !delta) return;
  const { data, error } = await supabase
    .from("accounts")
    .select("current_balance")
    .eq("id", accountId)
    .single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      current_balance: data.current_balance + delta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);
  if (updateError) throw updateError;
}

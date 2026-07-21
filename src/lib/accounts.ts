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

/** Shift an account's current balance by a realized P&L delta. */
export async function adjustAccountBalance(
  accountId: string,
  delta: number,
): Promise<void> {
  if (!delta) return;
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

import { supabase } from "./supabase";

export type Setup = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SetupWithTrades = Setup & {
  trades: { status: string; profit_loss: number | null }[];
};

export async function listSetups(): Promise<Setup[]> {
  const { data, error } = await supabase
    .from("setups")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listSetupsWithStats(): Promise<SetupWithTrades[]> {
  const { data, error } = await supabase
    .from("setups")
    .select("*, trades(status, profit_loss)")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SetupWithTrades[];
}

export async function createSetup(
  userId: string,
  name: string,
  description: string | null = null,
): Promise<Setup> {
  const { data, error } = await supabase
    .from("setups")
    .insert({ user_id: userId, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSetup(
  id: string,
  fields: { name: string; description: string | null },
): Promise<Setup> {
  const { data, error } = await supabase
    .from("setups")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSetup(id: string): Promise<void> {
  const { error } = await supabase.from("setups").delete().eq("id", id);
  if (error) throw error;
}

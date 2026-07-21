import { supabase } from "./supabase";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(
  userId: string,
  fields: Partial<
    Pick<Profile, "username" | "display_name" | "timezone" | "avatar_url">
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** avatar_url stores a storage path; older data may hold a full URL. */
export async function avatarDisplayUrl(
  stored: string,
): Promise<string> {
  if (/^https?:\/\//.test(stored)) return stored;
  const { data, error } = await supabase.storage
    .from("avatar")
    .createSignedUrl(stored, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatar")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function deleteAvatarFile(stored: string): Promise<void> {
  if (/^https?:\/\//.test(stored)) return;
  // Best-effort cleanup; a stale file is not worth failing the flow over.
  await supabase.storage.from("avatar").remove([stored]);
}

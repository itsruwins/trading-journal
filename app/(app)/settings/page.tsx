"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/auth";
import { useProfile } from "@/src/lib/profile-context";
import { friendlyAuthError } from "@/src/lib/auth-errors";
import {
  avatarDisplayUrl,
  deleteAvatarFile,
  getProfile,
  saveProfile,
  uploadAvatar,
  type Profile,
} from "@/src/lib/profile";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Select } from "@/src/components/ui/select";
import { TextField } from "@/src/components/ui/text-field";
import { useToast } from "@/src/components/ui/toast";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

function timezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return [Intl.DateTimeFormat().resolvedOptions().timeZone];
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-hidden="true">
      {[220, 180].map((height, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-edge bg-surface"
          style={{ height }}
        />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { refresh: refreshSharedProfile } = useProfile();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [saving, setSaving] = useState(false);

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const loadAvatar = useCallback(async (stored: string | null) => {
    if (!stored) {
      setAvatarSrc(null);
      return;
    }
    try {
      setAvatarSrc(await avatarDisplayUrl(stored));
    } catch {
      setAvatarSrc(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getProfile(user.id)
      .then(async (data) => {
        if (cancelled) return;
        setProfile(data);
        setDisplayName(data?.display_name ?? "");
        setUsername(data?.username ?? "");
        if (data?.timezone) setTimezone(data.timezone);
        await loadAvatar(data?.avatar_url ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load your profile",
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
  }, [user, loadAvatar, toast]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername && !USERNAME_PATTERN.test(trimmedUsername)) {
      setUsernameError(
        "3–30 characters: lowercase letters, numbers, and underscores.",
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await saveProfile(user.id, {
        display_name: displayName.trim() || null,
        username: trimmedUsername || null,
        timezone,
      });
      setProfile(updated);
      refreshSharedProfile();
      toast({ title: "Profile saved", variant: "success" });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "23505") {
        setUsernameError("That username is taken. Try another.");
      } else {
        toast({
          title: "Couldn't save your profile",
          description: "Please try again.",
          variant: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "That file isn't an image",
        description: "Use a PNG, JPG, or WebP.",
        variant: "error",
      });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "Image is too large",
        description: "Keep it under 5 MB.",
        variant: "error",
      });
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setAvatarSrc(localPreview);
    const previousPath = profile?.avatar_url ?? null;

    try {
      const path = await uploadAvatar(user.id, file);
      const updated = await saveProfile(user.id, { avatar_url: path });
      setProfile(updated);
      if (previousPath && previousPath !== path) {
        await deleteAvatarFile(previousPath);
      }
      refreshSharedProfile();
      toast({ title: "Photo updated", variant: "success" });
    } catch (error) {
      setAvatarSrc(null);
      await loadAvatar(previousPath);
      toast({
        title: "Upload failed",
        description:
          (error as { message?: string })?.message ??
          "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    if (!user || !profile?.avatar_url) return;
    setUploading(true);
    const previousPath = profile.avatar_url;
    try {
      const updated = await saveProfile(user.id, { avatar_url: null });
      setProfile(updated);
      setAvatarSrc(null);
      await deleteAvatarFile(previousPath);
      refreshSharedProfile();
      toast({ title: "Photo removed", variant: "success" });
    } catch {
      toast({
        title: "Couldn't remove the photo",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let valid = true;
    if (newPassword.length < 6) {
      setPasswordError("Use at least 6 characters.");
      valid = false;
    }
    if (confirmPassword !== newPassword) {
      setConfirmError("Passwords don't match.");
      valid = false;
    }
    if (!valid) return;

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPasswordSaving(false);

    if (error) {
      toast({
        title: "Couldn't update password",
        description: friendlyAuthError(error),
        variant: "error",
      });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", variant: "success" });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!loaded) return <SettingsSkeleton />;

  const initial =
    (displayName.trim() || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card title="Profile">
        <div className="flex items-center gap-5">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt="Your profile photo"
              className="size-16 shrink-0 rounded-full border border-edge-strong object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-raised text-xl font-medium text-muted"
            >
              {initial}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload photo
              </Button>
              {profile?.avatar_url && !uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAvatarRemove}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="mt-2 text-[13px] text-muted">
              PNG, JPG, or WebP, up to 5 MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Choose a profile photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarChange(file);
            }}
          />
        </div>

        <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
          <TextField
            label="Display name"
            name="display_name"
            autoComplete="name"
            placeholder="How you want to appear"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            placeholder="your_handle"
            hint={
              usernameError
                ? undefined
                : "Lowercase letters, numbers, and underscores."
            }
            error={usernameError ?? undefined}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (usernameError) setUsernameError(null);
            }}
          />
          <Select
            label="Timezone"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            hint="Used for daily P&L grouping and the calendar."
          >
            {timezones().map((tz) => (
              <option key={tz} value={tz}>
                {tz.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Account">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted">Email</p>
            <p className="mt-1 text-[15px] text-ink">{user?.email}</p>
          </div>
        </div>

        <form
          onSubmit={handlePasswordSave}
          className="mt-6 space-y-5 border-t border-edge pt-6"
        >
          <TextField
            label="New password"
            type="password"
            name="new-password"
            autoComplete="new-password"
            hint={passwordError ? undefined : "At least 6 characters."}
            error={passwordError ?? undefined}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
          />
          <TextField
            label="Confirm new password"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            error={confirmError ?? undefined}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError(null);
            }}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={passwordSaving}
            >
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Session">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] text-muted">
            Sign out of your account on this device.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={signingOut}
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}

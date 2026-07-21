"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { avatarDisplayUrl, getProfile, type Profile } from "./profile";

type ProfileState = {
  profile: Profile | null;
  avatarUrl: string | null;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  avatarUrl: null,
  refresh: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = user ? await getProfile(user.id) : null;
      setProfile(data);
      if (data?.avatar_url) {
        setAvatarUrl(await avatarDisplayUrl(data.avatar_url));
      } else {
        setAvatarUrl(null);
      }
    } catch {
      // Non-critical; the UI falls back to email + initial.
    }
  }, [user]);

  useEffect(() => {
    const id = setTimeout(refresh, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, avatarUrl, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

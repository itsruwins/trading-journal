"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { ProfileProvider } from "@/src/lib/profile-context";
import { Spinner } from "@/src/components/ui/spinner";
import { ToastProvider } from "@/src/components/ui/toast";
import { Topbar } from "@/src/components/shell/topbar";
import { Dock } from "@/src/components/shell/dock";
import { CommandPalette } from "@/src/components/shell/command-palette";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  if (loading || !session) {
    return (
      <div
        className="grid min-h-dvh place-items-center"
        role="status"
        aria-label="Loading"
      >
        <Spinner className="size-5 text-faint" />
      </div>
    );
  }

  return (
    <ProfileProvider>
      <ToastProvider>
        <div className="flex min-h-dvh flex-col">
          <Topbar />
          {/* The dock floats over the page, so the bottom padding here is what
              keeps the last row of any list clear of it. */}
          <main className="flex-1 overflow-x-clip px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
        <Dock />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
        />
      </ToastProvider>
    </ProfileProvider>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Settings } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/auth";
import { useProfile } from "@/src/lib/profile-context";
import { ALL_NAV } from "./nav";

function UserMenu() {
  const { user } = useAuth();
  const { profile, avatarUrl } = useProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const displayName =
    profile?.display_name?.trim() || user?.email || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-edge-strong bg-raised text-[13px] font-medium text-ink transition-colors duration-150 ease-out hover:border-accent/40"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            style={{ transformOrigin: "top right" }}
            className="modal-enter absolute right-0 top-full z-40 mt-2 w-56 rounded-md border border-edge-strong bg-raised p-1 shadow-xl"
          >
            <div className="px-3 py-2">
              <p className="truncate text-[14px] font-medium text-ink">
                {displayName}
              </p>
            </div>
            <div className="my-1 h-px bg-edge" aria-hidden="true" />
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-[13px] text-muted transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
            >
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-[13px] text-muted transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Topbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const title =
    ALL_NAV.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-canvas/75 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Open navigation"
        className="flex size-9 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h1>
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}

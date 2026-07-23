"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { ProfileProvider } from "@/src/lib/profile-context";
import { Spinner } from "@/src/components/ui/spinner";
import { ToastProvider } from "@/src/components/ui/toast";
import { Sidebar } from "@/src/components/shell/sidebar";
import { Topbar } from "@/src/components/shell/topbar";
import { MobileNav } from "@/src/components/shell/mobile-nav";

const SIDEBAR_KEY = "sidebar-collapsed";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Lazy init: the sidebar isn't in the first hydrated frame (auth gate
  // renders a spinner), so reading localStorage here is mismatch-safe.
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_KEY) === "1",
  );

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

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
        <div className="flex min-h-dvh">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenuOpen={() => setDrawerOpen(true)} />
            <main className="flex-1 overflow-x-clip px-4 py-8 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
        <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </ToastProvider>
    </ProfileProvider>
  );
}

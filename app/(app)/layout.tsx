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

export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenuOpen={() => setDrawerOpen(true)} />
            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
        <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </ToastProvider>
    </ProfileProvider>
  );
}

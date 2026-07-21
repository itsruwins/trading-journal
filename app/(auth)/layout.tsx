"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { Logo } from "@/src/components/logo";
import { ThemeToggle } from "@/src/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="animate-rise w-full max-w-90">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        {children}
      </main>
    </div>
  );
}

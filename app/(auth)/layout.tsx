"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { Logo } from "@/src/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,oklch(0.58_0.17_290_/_0.13),transparent_70%)]"
      />
      <main className="animate-rise w-full max-w-90">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        {children}
      </main>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { Spinner } from "@/src/components/ui/spinner";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(session ? "/dashboard" : "/login");
  }, [loading, session, router]);

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

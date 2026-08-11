"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth";
import { Spinner } from "@/src/components/ui/spinner";

/* `/` is the marketing page for signed-out visitors and a doorway for everyone
   else. The page renders statically and paints immediately; this only mounts a
   cover once a session has actually resolved, so a visitor with no account
   never waits on an auth round-trip to see the page, and a signed-in one never
   watches the landing page scroll past on the way to their dashboard. */

export function SignedInRedirect() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const signedIn = !loading && session !== null;

  useEffect(() => {
    if (signedIn) router.replace("/dashboard");
  }, [signedIn, router]);

  if (!signedIn) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-canvas"
      role="status"
      aria-label="Opening your dashboard"
    >
      <Spinner className="size-5 text-faint" />
    </div>
  );
}

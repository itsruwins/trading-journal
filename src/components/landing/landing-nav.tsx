"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { Logo } from "@/src/components/logo";
import { CtaLink } from "./cta";

/* Translucent chrome, the way the app's topbar does it: content scrolls under
   the bar rather than the bar reserving a strip. The material fades in on the
   first few pixels of scroll — over the hero it would be blurring a background
   that isn't there, which reads as a grey band rather than glass. */

const LINKS = [
  { href: "#evidence", label: "Why" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16">
      <div
        aria-hidden="true"
        className={cn(
          "glass-bar absolute inset-0 transition-opacity duration-300 ease-out",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="relative mx-auto flex h-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="Trading Journal — home"
          className="flex shrink-0 items-center rounded-md transition-opacity duration-150 ease-out hover:opacity-80"
        >
          <Logo />
        </Link>

        <nav aria-label="Sections" className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-[14px] text-muted transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <CtaLink href="/login" variant="ghost" size="sm">
            Log in
          </CtaLink>
          <CtaLink href="/signup" size="sm">
            Create account
          </CtaLink>
        </div>
      </div>
    </header>
  );
}

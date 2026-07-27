"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { MAIN_NAV, MORE_NAV, isActiveHref, type NavItem } from "./nav";

/* The dock is a floating translucent layer, not a bar that reserves a strip:
   content scrolls underneath it. Radii are concentric — an 18px shell with
   6px of padding wants 12px tabs, or the corners read as slightly wrong
   without anyone being able to say why. */

const TAB =
  "flex min-h-12 flex-1 select-none flex-col items-center justify-center gap-1 rounded-xl px-3 text-[11px] font-medium leading-none transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-w-18 sm:flex-none";

function tabState(active: boolean): string {
  return active
    ? "bg-selected text-ink"
    : "text-faint hover:bg-hover hover:text-muted";
}

function DockTab({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActiveHref(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${TAB} ${tabState(active)}`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

/* Rises from the dock and scales out of its own tab — the panel emerges from
   the control that opened it, and dismisses back along the same path. */
function MorePanel({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <div
      role="menu"
      id="dock-more-panel"
      className="modal-enter absolute inset-x-0 bottom-full mb-2 origin-bottom rounded-2xl border border-edge-strong bg-raised p-1.5 shadow-xl sm:left-auto sm:w-56 sm:origin-bottom-right"
    >
      {MORE_NAV.map((item) => {
        const active = isActiveHref(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-150 ease-out ${
              active
                ? "bg-selected font-medium text-ink"
                : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            <Icon
              className={`size-4 shrink-0 ${active ? "text-ink" : "text-faint"}`}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Dock() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_NAV.some((item) => isActiveHref(pathname, item.href));

  // Matches the account menu's behaviour, so both overflows dismiss the same way.
  useEffect(() => {
    if (!moreOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        /* Dims the page on a phone so the panel reads as the focused layer;
           on a pointer device it's an invisible click-catcher only. */
        <div
          className="animate-fade fixed inset-0 z-30 bg-[var(--backdrop)] sm:bg-transparent"
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto relative w-full sm:w-auto">
          {moreOpen && <MorePanel onNavigate={() => setMoreOpen(false)} />}

          <nav
            aria-label="Main"
            className="flex items-stretch gap-0.5 rounded-[1.125rem] border border-edge-strong bg-raised/70 p-1.5 shadow-xl backdrop-blur-xl backdrop-saturate-150"
          >
            {MAIN_NAV.map((item) => (
              <DockTab key={item.href} item={item} />
            ))}

            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-controls="dock-more-panel"
              className={`${TAB} ${tabState(moreActive || moreOpen)}`}
            >
              <Ellipsis className="size-[18px] shrink-0" aria-hidden="true" />
              <span>More</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

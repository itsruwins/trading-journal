"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { useLiquidGlass } from "@/src/components/ui/liquid-glass";
import { MAIN_NAV, MORE_NAV, isActiveHref, type NavItem } from "./nav";

/* The dock is a floating glass layer, not a bar that reserves a strip:
   content scrolls underneath it. Radii are concentric — an 18px shell with
   6px of padding wants 12px tabs, or the corners read as slightly wrong
   without anyone being able to say why.

   The selection highlight is a single element that owns its own geometry,
   rather than one-per-tab handed to Motion's shared-element system. That
   system measures a destination box once at commit time; when the pill is
   also resizing (which a route change always triggers, since the new page
   lands at the top) the measurement is stale before the animation starts and
   the highlight flies in from outside the bar.

   Because the highlight's x is an affine function of the tab widths, running
   both on the *same* spring keeps them in lockstep by construction: identical
   spring progress applied to both sides of the same equation. */

const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;
const PANEL_SPRING = { type: "spring", bounce: 0.18, duration: 0.38 } as const;

/** Past this much downward scroll the dock contracts to icons. */
const CONTRACT_AFTER = 24;

/** Comfortably past the spring's duration, so the lens never rebuilds mid-morph. */
const SETTLE_MS = 480;

/* Collapsed geometry. Width is generous enough that four icons don't read as
   crowded; height drops because the tab no longer has to fit a label under
   the icon, but stays at 44px so the touch target still meets the minimum. */
const COLLAPSED_W = 52;
const COLLAPSED_H = 44;
const EXPANDED_H = 48;

/** Must match `gap-0.5` and the nav's animated padding below. */
const GAP = 2;
const PAD_CONTRACTED = 4;
const PAD_EXPANDED = 6;

/** Matches `rounded-[1.125rem]` on the nav. */
const SHELL_RADIUS = 18;

/* Concentric radii: the inner corner is the shell's radius minus the gap
   between them, so the chip stays parallel to the pill all the way round.
   The padding animates, so the radius has to as well — pinning it at 12 left
   the contracted state 2px tight, which shows up as the corners pulling away
   from the shell even though the straight edges look right. */
function innerRadius(pad: number): number {
  return SHELL_RADIUS - pad;
}

/* Pointer-tracked specular. Apple's rim highlight answers to device tilt; on a
   pointer device the cursor is the equivalent light source. Writes two custom
   properties straight to the node — no React state, so moving the mouse over
   the dock never triggers a render. The rect is cached on enter because the
   dock is fixed, and reads of it per move would be a layout thrash. */
function usePointerSheen(enabled: boolean) {
  const rect = useRef<DOMRect | null>(null);
  const frame = useRef(0);

  function apply(el: HTMLElement, clientX: number, clientY: number) {
    const r = rect.current;
    if (!r) return;
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    el.style.setProperty("--glass-spec-x", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--glass-spec-y", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--glass-rim-angle", `${(95 + x * 130).toFixed(0)}deg`);
  }

  return {
    onPointerEnter(e: React.PointerEvent<HTMLElement>) {
      if (!enabled || e.pointerType !== "mouse") return;
      rect.current = e.currentTarget.getBoundingClientRect();
      apply(e.currentTarget, e.clientX, e.clientY);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (!enabled || e.pointerType !== "mouse" || frame.current) return;
      const el = e.currentTarget;
      const { clientX, clientY } = e;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        apply(el, clientX, clientY);
      });
    },
    onPointerLeave(e: React.PointerEvent<HTMLElement>) {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      rect.current = null;
      const el = e.currentTarget;
      el.style.removeProperty("--glass-spec-x");
      el.style.removeProperty("--glass-spec-y");
      el.style.removeProperty("--glass-rim-angle");
    },
  };
}

/* `overflow-hidden` clips the label as the pill resizes. The highlight is no
   longer inside a tab, so nothing clips it while it travels. */
const TAB =
  "relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden rounded-xl px-2 min-[360px]:px-3 text-[11px] font-medium leading-none transition-colors duration-150 ease-out active:scale-[0.94] motion-reduce:active:scale-100";

/* Inactive tabs sit on a translucent surface whose backdrop changes as the
   page scrolls, so they use --muted rather than the dimmer --faint: at 0.58
   lightness the labels have almost no contrast margin left over bright
   content showing through the glass. */
function tabState(active: boolean): string {
  return active ? "text-ink" : "text-muted hover:text-ink";
}

function DockItem({
  width,
  contracted,
  children,
}: {
  width: number | "auto";
  contracted: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        width,
        height: contracted ? COLLAPSED_H : EXPANDED_H,
      }}
      transition={SPRING}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

function TabLabel({
  contracted,
  children,
}: {
  contracted: boolean;
  children: ReactNode;
}) {
  return (
    <motion.span
      initial={false}
      /* Height and margin collapse too, not just opacity. Fading alone leaves
         the label's line box in flow, so the tab centres icon-plus-invisible-
         label and the icons sit ~5px above true centre when contracted. */
      animate={{
        opacity: contracted ? 0 : 1,
        height: contracted ? 0 : "auto",
        marginTop: contracted ? 0 : 4,
      }}
      transition={SPRING}
      /* The label sizes an expanded tab, so a floor here is what keeps the four
         tabs from stepping unevenly with their label lengths. Only from 360px
         up: the floor widens the pill to 315px, which would eat its own gutter
         on a 320px phone. */
      className="block overflow-hidden whitespace-nowrap text-center min-[360px]:min-w-12"
    >
      {children}
    </motion.span>
  );
}

/* Rises from the dock and scales out of its own tab — the panel emerges from
   the control that opened it, and dismisses back along the same path. */
function MorePanel({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const [glassRef, glass] = useLiquidGlass({ variant: "clear", radius: 16 });

  return (
    <>
      <motion.div
        ref={glassRef}
        role="menu"
        id="dock-more-panel"
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={PANEL_SPRING}
        style={glass.style}
        className={cn(
          glass.className,
          /* Anchored per-breakpoint rather than `inset-x-0` + `left-auto`,
             so the two never have to fight over the same edge. */
          "absolute bottom-full mb-2 origin-bottom rounded-2xl p-1.5",
          "max-sm:inset-x-0 sm:right-0 sm:w-56 sm:origin-bottom-right",
        )}
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
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-150 ease-out",
                active
                  ? "glass-chip font-medium text-ink"
                  : "text-muted hover:bg-hover hover:text-ink",
              )}
            >
              <Icon
                className={cn("size-4 shrink-0", active ? "text-ink" : "text-muted")}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </motion.div>
      {glass.lensDefs}
    </>
  );
}

export function Dock() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const moreActive = MORE_NAV.some((item) => isActiveHref(pathname, item.href));

  // Opening the menu implies intent to navigate, so the dock expands.
  const contracted = scrolledDown && !moreOpen && !reduceMotion;

  /* A route change lands at the top of the new page, so a contracted dock has
     to expand. Flipping it here rather than waiting for the scroll event puts
     the expand in the same commit as the highlight's move, which is what lets
     the two share one spring instead of racing. */
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (scrolledDown) setScrolledDown(false);
    /* Any navigation dismisses the overflow panel — including a browser back
       button or the command palette, not just a tap inside it. Without this
       the panel stays open and keeps the highlight pinned to More while the
       page underneath has already changed. */
    setMoreOpen(false);
  }

  /* Regenerating the lens map costs a synchronous canvas pass, and measuring
     the contract showed it landing mid-spring as a dropped frame. Refraction
     is suspended while the dock is resizing and restored once it settles. */
  const [settled, setSettled] = useState(true);
  const [lastContracted, setLastContracted] = useState(contracted);
  if (contracted !== lastContracted) {
    setLastContracted(contracted);
    setSettled(false);
  }

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [settled]);

  const [glassRef, glass] = useLiquidGlass({
    variant: "clear",
    radius: 18,
    refract: settled,
  });
  const sheen = usePointerSheen(!reduceMotion);

  /* Expanded tab widths are label-driven, so they have to be measured — but
     `scrollWidth` reports the content width even while the tab is clipped
     down to 52px, so one measurement holds for both states. */
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const [naturalW, setNaturalW] = useState<number[] | null>(null);

  useEffect(() => {
    function measure() {
      setNaturalW(
        tabRefs.current.map((el) =>
          el ? Math.round(el.scrollWidth) : COLLAPSED_W,
        ),
      );
    }
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let last = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (y <= CONTRACT_AFTER) setScrolledDown(false);
      else if (y > last + 4) setScrolledDown(true);
      else if (y < last - 4) setScrolledDown(false);
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion]);

  // Matches the account menu's behaviour, so both overflows dismiss the same way.
  useEffect(() => {
    if (!moreOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [moreOpen]);

  /* One highlight for every state — main tabs and More alike, so it slides
     between them instead of one fading out while another fades in. */
  const activeIndex = MAIN_NAV.findIndex((item) =>
    isActiveHref(pathname, item.href),
  );
  const highlightIndex =
    moreActive || moreOpen ? MAIN_NAV.length : activeIndex;

  const pad = contracted ? PAD_CONTRACTED : PAD_EXPANDED;

  /* The first and last tabs are matched to the wider of the two. Icons are
     centred inside their own tab, so unequal end tabs push the whole row off
     centre — Dashboard's 80px against More's 72px left the row sitting 2px
     right of the pill's middle. Only the ends matter; the interior can vary. */
  const expandedW = naturalW ? [...naturalW] : null;
  if (expandedW && expandedW.length > 1) {
    const edge = Math.max(expandedW[0], expandedW[expandedW.length - 1]);
    expandedW[0] = edge;
    expandedW[expandedW.length - 1] = edge;
  }
  const widths = (expandedW ?? []).map((w) => (contracted ? COLLAPSED_W : w));
  const highlight =
    naturalW && highlightIndex >= 0
      ? {
          x: pad + widths.slice(0, highlightIndex).reduce((a, w) => a + w + GAP, 0),
          y: pad,
          width: widths[highlightIndex] ?? COLLAPSED_W,
          height: contracted ? COLLAPSED_H : EXPANDED_H,
          borderRadius: innerRadius(pad),
        }
      : null;

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
        {/* Content-width at every breakpoint, so one animation covers both. */}
        <div className="pointer-events-auto relative">
          <AnimatePresence>
            {moreOpen && <MorePanel onNavigate={() => setMoreOpen(false)} />}
          </AnimatePresence>

          <motion.nav
            ref={glassRef as React.Ref<HTMLElement>}
            aria-label="Main"
            {...sheen}
            initial={false}
            /* Padding tightens with the tabs, so the collapsed pill loses
               height rather than just becoming a shorter-content version
               of the expanded one. */
            animate={{ padding: pad }}
            transition={SPRING}
            style={glass.style}
            className={cn(
              glass.className,
              "flex items-stretch gap-0.5 rounded-[1.125rem]",
            )}
          >
            {highlight && (
              <motion.span
                initial={false}
                animate={highlight}
                transition={SPRING}
                className="glass-chip pointer-events-none absolute left-0 top-0"
                aria-hidden="true"
              />
            )}

            {MAIN_NAV.map((item: NavItem, i) => {
              const active = isActiveHref(pathname, item.href);
              const Icon = item.icon;
              return (
                <DockItem
                  key={item.href}
                  width={contracted ? COLLAPSED_W : (widths[i] ?? "auto")}
                  contracted={contracted}
                >
                  <Link
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    href={item.href}
                    // Closes immediately rather than waiting for the route to
                    // commit, and covers tapping the tab you're already on.
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    // The label is clipped away when contracted, so the
                    // accessible name lives here permanently.
                    aria-label={item.label}
                    title={contracted ? item.label : undefined}
                    className={cn(TAB, tabState(active))}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <TabLabel contracted={contracted}>{item.label}</TabLabel>
                  </Link>
                </DockItem>
              );
            })}

            <DockItem
              width={
                contracted ? COLLAPSED_W : (widths[MAIN_NAV.length] ?? "auto")
              }
              contracted={contracted}
            >
              <button
                ref={(el) => {
                  tabRefs.current[MAIN_NAV.length] = el;
                }}
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls="dock-more-panel"
                aria-label="More"
                title={contracted ? "More" : undefined}
                className={cn(TAB, tabState(moreActive || moreOpen))}
              >
                <Ellipsis className="size-[18px] shrink-0" aria-hidden="true" />
                <TabLabel contracted={contracted}>More</TabLabel>
              </button>
            </DockItem>
          </motion.nav>
        </div>
      </div>
      {glass.lensDefs}
    </>
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/src/lib/cn";

/* Scroll reveal that fails visible.

   The rule from the design system: a reveal enhances an already-visible
   default, it never gates content on JS. So the hidden state lives behind
   `[data-reveal="on"]` on <html>, which only BOOT_SCRIPT sets — and only after
   confirming IntersectionObserver exists. Three independent ways out:

     1. No JS / no IntersectionObserver  →  attribute never set, page visible.
     2. React never hydrates             →  the script's own timer clears it.
     3. Observer attaches but misfires   →  each element's local fallback timer.

   The window flag is how the script tells (2) from a slow-but-fine hydration:
   the first Reveal to mount sets it, and the script stands down. */

declare global {
  interface Window {
    __landingRevealReady?: boolean;
  }
}

export const REVEAL_BOOT_SCRIPT = `(function(){try{
if(!('IntersectionObserver' in window))return;
var d=document.documentElement;
d.setAttribute('data-reveal','on');
setTimeout(function(){if(!window.__landingRevealReady)d.removeAttribute('data-reveal')},4000);
}catch(e){}})()`;

/** Local safety net: reveal regardless if the observer hasn't fired by now. */
const FALLBACK_MS = 2500;

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  /** Milliseconds, for staggering siblings within one group. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    window.__landingRevealReady = true;

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const fallback = setTimeout(() => setShown(true), FALLBACK_MS);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShown(true);
        observer.disconnect();
        clearTimeout(fallback);
      },
      /* Negative bottom margin holds the trigger until the element is properly
         in view rather than one pixel over the fold; the positive top keeps
         anything scrolled past from animating on the way back up. */
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "true" : undefined}
      style={
        delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined
      }
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}

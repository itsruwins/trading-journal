"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export function useMeasure(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/** Clean axis ticks: ~4 rounded steps covering [min, max]. */
export function niceTicks(min: number, max: number): number[] {
  if (min === max) {
    return min === 0 ? [0, 1] : [0, Math.round(max * 100) / 100];
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const candidates = [step, step * 2, step * 2.5, step * 5, step * 10];
  const chosen =
    candidates.find((c) => span / c <= 5) ?? candidates[candidates.length - 1];
  const start = Math.floor(min / chosen) * chosen;
  const ticks: number[] = [];
  for (let v = start; v <= max + chosen * 0.001; v += chosen) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(0)}K`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.round(value * 100) / 100}`;
}

export function signedCompact(value: number): string {
  return `${value < 0 ? "−" : ""}${compactNumber(Math.abs(value))}`;
}

export function Tooltip({
  x,
  y,
  containerWidth,
  children,
}: {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}) {
  const flip = containerWidth > 0 && x > containerWidth - 150;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-28 rounded-md border border-edge-strong bg-raised px-3 py-2 shadow-xl"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

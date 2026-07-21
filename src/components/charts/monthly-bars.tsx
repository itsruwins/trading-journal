"use client";

import { useMemo, useState } from "react";
import type { MonthBar } from "@/src/lib/stats";
import {
  compactNumber,
  niceTicks,
  signedCompact,
  Tooltip,
  useMeasure,
} from "./chart-utils";

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 24, left: 44 };
const MAX_BAR = 24;

export function MonthlyBars({ bars }: { bars: MonthBar[] }) {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (width === 0 || bars.length === 0) return null;
    const values = bars.map((b) => b.value);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const ticks = niceTicks(min, max);
    const lo = Math.min(min, ticks[0]);
    const hi = Math.max(max, ticks[ticks.length - 1]);
    const span = hi - lo || 1;

    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const band = innerW / bars.length;
    const barW = Math.min(MAX_BAR, band * 0.55);
    const x = (i: number) => PAD.left + band * i + (band - barW) / 2;
    const y = (v: number) => PAD.top + innerH - ((v - lo) / span) * innerH;

    return { x, y, band, barW, ticks, zero: y(0) };
  }, [width, bars]);

  return (
    <div ref={ref} className="relative">
      {plot && (
        <svg
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label="Monthly profit and loss"
        >
          {plot.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={plot.y(t)}
                y2={plot.y(t)}
                stroke="var(--edge)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={plot.y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-faint text-[11px] tabular"
              >
                {compactNumber(t)}
              </text>
            </g>
          ))}

          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={plot.zero}
            y2={plot.zero}
            stroke="var(--edge-strong)"
            strokeWidth="1"
          />

          {bars.map((bar, i) => {
            const positive = bar.value >= 0;
            const top = positive ? plot.y(bar.value) : plot.zero;
            const h = Math.max(1, Math.abs(plot.y(bar.value) - plot.zero));
            const r = Math.min(4, plot.barW / 2, h);
            // Rounded at the data end, square at the baseline.
            const d = positive
              ? `M${plot.x(i)},${top + h}V${top + r}Q${plot.x(i)},${top} ${
                  plot.x(i) + r
                },${top}H${plot.x(i) + plot.barW - r}Q${
                  plot.x(i) + plot.barW
                },${top} ${plot.x(i) + plot.barW},${top + r}V${top + h}Z`
              : `M${plot.x(i)},${top}V${top + h - r}Q${plot.x(i)},${
                  top + h
                } ${plot.x(i) + r},${top + h}H${
                  plot.x(i) + plot.barW - r
                }Q${plot.x(i) + plot.barW},${top + h} ${
                  plot.x(i) + plot.barW
                },${top + h - r}V${top}Z`;
            return (
              <g key={bar.label}>
                <path
                  d={d}
                  fill={positive ? "var(--positive)" : "var(--negative)"}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                <rect
                  x={PAD.left + plot.band * i}
                  y={PAD.top}
                  width={plot.band}
                  height={HEIGHT - PAD.top - PAD.bottom}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
                <text
                  x={plot.x(i) + plot.barW / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-faint text-[11px]"
                >
                  {bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {plot && hover != null && (
        <Tooltip
          x={plot.x(hover) + plot.barW / 2}
          y={plot.y(bars[hover].value)}
          containerWidth={width}
        >
          <p
            className={`tabular text-[14px] font-semibold ${
              bars[hover].value >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {signedCompact(bars[hover].value)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">{bars[hover].label}</p>
        </Tooltip>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, type PointerEvent } from "react";
import type { EquityPoint } from "@/src/lib/stats";
import {
  compactNumber,
  niceTicks,
  signedCompact,
  Tooltip,
  useMeasure,
} from "./chart-utils";

const PAD = { top: 16, right: 16, bottom: 26, left: 48 };

export function EquityCurve({
  points,
  height: HEIGHT = 260,
}: {
  points: EquityPoint[];
  height?: number;
}) {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (width === 0 || points.length === 0) return null;

    const values = points.map((p) => p.equity);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const ticks = niceTicks(min, max);
    const lo = Math.min(min, ticks[0]);
    const hi = Math.max(max, ticks[ticks.length - 1]);
    const span = hi - lo || 1;

    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) =>
      PAD.left +
      (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - ((v - lo) / span) * innerH;

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.equity)}`)
      .join("");
    const area = `${line}L${x(points.length - 1)},${y(
      Math.max(lo, 0),
    )}L${x(0)},${y(Math.max(lo, 0))}Z`;

    return { x, y, line, area, ticks, zero: y(0) };
  }, [width, points, HEIGHT]);

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    if (!plot || points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const innerW = width - PAD.left - PAD.right;
    const ratio = Math.min(1, Math.max(0, (px - PAD.left) / (innerW || 1)));
    setHover(Math.round(ratio * (points.length - 1)));
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  });

  return (
    <div ref={ref} className="relative">
      {plot && (
        <svg
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label="Equity curve of cumulative profit and loss"
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
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

          {plot.ticks[0] < 0 && (
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={plot.zero}
              y2={plot.zero}
              stroke="var(--edge-strong)"
              strokeWidth="1"
            />
          )}

          <path d={plot.area} fill="var(--accent)" opacity="0.1" />
          <path
            d={plot.line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.length > 0 && (
            <circle
              cx={plot.x(points.length - 1)}
              cy={plot.y(points[points.length - 1].equity)}
              r="4"
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          )}

          {hover != null && (
            <g>
              <line
                x1={plot.x(hover)}
                x2={plot.x(hover)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="var(--edge-strong)"
                strokeWidth="1"
              />
              <circle
                cx={plot.x(hover)}
                cy={plot.y(points[hover].equity)}
                r="4"
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          )}

          {points.length > 1 && (
            <>
              <text
                x={PAD.left}
                y={HEIGHT - 8}
                className="fill-faint text-[11px]"
              >
                {dateFmt.format(points[0].date)}
              </text>
              <text
                x={width - PAD.right}
                y={HEIGHT - 8}
                textAnchor="end"
                className="fill-faint text-[11px]"
              >
                {dateFmt.format(points[points.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      )}

      {plot && hover != null && (
        <Tooltip
          x={plot.x(hover)}
          y={plot.y(points[hover].equity)}
          containerWidth={width}
        >
          <p className="tabular text-[14px] font-semibold text-ink">
            {compactNumber(points[hover].equity)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {points[hover].pair}{" "}
            <span
              className={
                points[hover].pnl >= 0 ? "text-positive" : "text-negative"
              }
            >
              {signedCompact(points[hover].pnl)}
            </span>
          </p>
          <p className="text-[11px] text-faint">
            {dateFmt.format(points[hover].date)}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

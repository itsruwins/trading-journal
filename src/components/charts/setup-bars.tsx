"use client";

import { useMemo, useState } from "react";
import type { SetupRow } from "@/src/lib/stats";
import { signedCompact, Tooltip, useMeasure } from "./chart-utils";

const ROW_H = 40;
const BAR_H = 14;
const LABEL_W = 140;
const VALUE_W = 64;

export function SetupBars({ rows }: { rows: SetupRow[] }) {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (width === 0 || rows.length === 0) return null;
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
    const innerW = width - LABEL_W - VALUE_W;
    const scale = (v: number) => (Math.abs(v) / maxAbs) * innerW;
    return { scale, innerW };
  }, [width, rows]);

  const height = rows.length * ROW_H;

  return (
    <div ref={ref} className="relative">
      {plot && (
        <svg
          width="100%"
          height={height}
          role="img"
          aria-label="Net profit and loss by setup"
        >
          {rows.map((row, i) => {
            const positive = row.value >= 0;
            const barLen = Math.max(2, plot.scale(row.value));
            const y = i * ROW_H + (ROW_H - BAR_H) / 2;
            const r = Math.min(4, BAR_H / 2, barLen);
            // Square at the value axis (left), rounded at the data end.
            const d = `M${LABEL_W},${y}H${LABEL_W + barLen - r}Q${
              LABEL_W + barLen
            },${y} ${LABEL_W + barLen},${y + r}V${y + BAR_H - r}Q${
              LABEL_W + barLen
            },${y + BAR_H} ${LABEL_W + barLen - r},${y + BAR_H}H${LABEL_W}Z`;
            return (
              <g
                key={row.name}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                <rect
                  x={0}
                  y={i * ROW_H}
                  width={width}
                  height={ROW_H}
                  fill={hover === i ? "oklch(1 0 0 / 0.03)" : "transparent"}
                />
                <text
                  x={0}
                  y={i * ROW_H + ROW_H / 2}
                  dominantBaseline="middle"
                  className="fill-muted text-[13px]"
                >
                  {row.name.length > 18
                    ? `${row.name.slice(0, 17)}…`
                    : row.name}
                </text>
                <path
                  d={d}
                  fill={positive ? "var(--positive)" : "var(--negative)"}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                <text
                  x={LABEL_W + barLen + 10}
                  y={i * ROW_H + ROW_H / 2}
                  dominantBaseline="middle"
                  className={`tabular text-[13px] font-medium ${
                    positive ? "fill-positive" : "fill-negative"
                  }`}
                >
                  {signedCompact(row.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {plot && hover != null && (
        <Tooltip
          x={LABEL_W + plot.scale(rows[hover].value)}
          y={hover * ROW_H + ROW_H / 2}
          containerWidth={width}
        >
          <p
            className={`tabular text-[14px] font-semibold ${
              rows[hover].value >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {signedCompact(rows[hover].value)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {rows[hover].name} · {rows[hover].count}{" "}
            {rows[hover].count === 1 ? "trade" : "trades"}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

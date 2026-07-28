"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import useMeasure from "react-use-measure";
import { cn } from "@/src/lib/cn";
import { createLensMap, supportsBackdropSvgFilter } from "@/src/lib/glass-lens";

/* The material lives in globals.css (.liquid-glass and its layers). This hook
   owns the part CSS can't express: measuring the surface and generating a
   displacement map matching its exact rounded geometry.

   Each instance gets its own filter id — dock, More panel and topbar are
   different sizes, and one shared map would smear all but one of them. */

export type GlassVariant = "clear" | "regular";

const VARIANT: Record<GlassVariant, string> = {
  clear: "liquid-glass--clear",
  regular: "liquid-glass--regular",
};

export type GlassProps = {
  className: string;
  style: CSSProperties | undefined;
  lensDefs: ReactNode;
};

/**
 * Returns `[ref, props]` — mirroring useMeasure's own shape so the measuring
 * ref is attached explicitly at the call site.
 */
export function useLiquidGlass({
  variant = "clear",
  radius = 18,
  refract = true,
  className,
}: {
  variant?: GlassVariant;
  radius?: number;
  refract?: boolean;
  className?: string;
} = {}): [(element: HTMLElement | SVGElement | null) => void, GlassProps] {
  const [measureRef, bounds] = useMeasure({ debounce: 120 });
  const rawId = useId();
  const filterId = `glass-lens-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);

  /* Pure function of geometry, so it memoizes rather than living in an effect:
     useMeasure's own state change drives the recompute, and the canvas is
     local and discarded. Recalculates on resize only, never per frame. */
  const lens = useMemo(() => {
    if (!refract || !supportsBackdropSvgFilter()) return null;
    if (width < 8 || height < 8) return null;
    return createLensMap({ width, height, radius });
  }, [refract, width, height, radius]);

  return [
    measureRef,
    {
      className: cn("liquid-glass", VARIANT[variant], className),
      style: lens
        ? ({ "--glass-refract": `url(#${filterId})` } as CSSProperties)
        : undefined,
      lensDefs: lens ? (
        <svg aria-hidden="true" className="pointer-events-none fixed size-0">
          <defs>
            <filter
              id={filterId}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={lens}
                x="0"
                y="0"
                width={width}
                height={height}
                result="map"
              />
              {/* Past roughly 25 the backdrop reads as a warped mirror rather
                  than a pane of glass. The spike ran at 45 to prove the
                  mechanism; production wants far less. */}
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="16"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null,
    },
  ];
}

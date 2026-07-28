/**
 * Displacement map generation for the Liquid Glass rim refraction.
 *
 * CSS has no primitive for refracting backdrop content, so the effect is
 * approximated with `backdrop-filter: url(#filter)` where the filter runs an
 * feDisplacementMap driven by a generated normal map. The map is neutral
 * (128,128) through the interior — no displacement — and ramps to
 * inward-pointing normals inside a band along the rounded-rect boundary,
 * which is where real glass concentrates its lensing.
 *
 * Verified working in Chromium. Safari does not support SVG filter references
 * in backdrop-filter, so it falls back to the plain blur material.
 */

/** Signed distance to a rounded rectangle; negative inside. */
function roundedRectSDF(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): number {
  const qx = Math.abs(x - w / 2) - (w / 2 - radius);
  const qy = Math.abs(y - h / 2) - (h / 2 - radius);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

export type LensOptions = {
  width: number;
  height: number;
  radius: number;
  /** Width of the refracting band inward from the edge, in px. */
  edge?: number;
};

/* Generating a map costs a per-pixel loop plus a synchronous toDataURL, which
   measured as a dropped frame when it landed mid-animation. Two defences:
   the map is rendered at half resolution (feImage scales it back up, and the
   displacement band is soft enough that it doesn't show), and results are
   cached, so contracting and expanding repeatedly never recomputes. */
const CACHE = new Map<string, string>();
const CACHE_LIMIT = 12;

/** Half-resolution: 4x fewer pixels for a band that's already gradual. */
const SCALE = 0.5;

/**
 * Renders the map to a canvas and returns a data URL for an `<feImage>`.
 * Runs on resize only — never per frame — and memoises by geometry.
 */
export function createLensMap({
  width,
  height,
  radius,
  edge = 18,
}: LensOptions): string | null {
  if (typeof document === "undefined") return null;
  if (width < 8 || height < 8) return null;

  const key = `${Math.round(width)}x${Math.round(height)}x${radius}x${edge}`;
  const hit = CACHE.get(key);
  if (hit) return hit;

  const w = Math.max(8, Math.round(width * SCALE));
  const h = Math.max(8, Math.round(height * SCALE));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(w, h);
  // Geometry is in canvas pixels, so it scales with the canvas.
  const r = Math.min(radius * SCALE, Math.min(w, h) / 2);
  const band = Math.max(1, edge * SCALE);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const distance = roundedRectSDF(x, y, w, h, r);

      // 0 through the interior, easing to 1 at the boundary.
      const t = Math.min(1, Math.max(0, (distance + band) / band));
      const ramp = t * t;

      // Gradient of the SDF approximates the outward normal.
      const gx =
        roundedRectSDF(x + 1, y, w, h, r) - roundedRectSDF(x - 1, y, w, h, r);
      const gy =
        roundedRectSDF(x, y + 1, w, h, r) - roundedRectSDF(x, y - 1, w, h, r);
      const length = Math.hypot(gx, gy) || 1;

      const i = (y * w + x) * 4;
      image.data[i] = Math.round(128 - (gx / length) * ramp * 127);
      image.data[i + 1] = Math.round(128 - (gy / length) * ramp * 127);
      image.data[i + 2] = 128;
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL();

  if (CACHE.size >= CACHE_LIMIT) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(key, url);
  return url;
}

let cached: boolean | null = null;

/**
 * Whether this engine applies SVG filter references in `backdrop-filter`.
 * Chromium does; Safari and Firefox do not, and get the blur material instead.
 */
export function supportsBackdropSvgFilter(): boolean {
  if (cached !== null) return cached;
  if (typeof CSS === "undefined" || typeof document === "undefined") {
    cached = false;
    return cached;
  }

  const supported =
    CSS.supports("backdrop-filter", "url(#x)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#x)");

  // Safari reports support for the property but silently drops the filter, so
  // require a Chromium-family engine before promising refraction.
  const chromium =
    typeof navigator !== "undefined" &&
    /Chrome|Chromium|Edg/.test(navigator.userAgent) &&
    !/Apple\s?WebKit\/605/.test(navigator.userAgent);

  cached = supported && chromium;
  return cached;
}

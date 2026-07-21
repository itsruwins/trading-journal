export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Signed currency for tight spaces: "+$400.00", "−$1,250.50",
 * compacting to "+$12K" once figures get long. Explicit sign always.
 */
export function formatSignedMoney(
  value: number,
  currency: string,
  compactFrom = 10_000,
): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      ...(abs >= compactFrom
        ? { notation: "compact" as const, maximumFractionDigits: 1 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    }).format(abs);
    return `${sign}${formatted}`;
  } catch {
    return `${sign}${currency} ${abs.toFixed(2)}`;
  }
}

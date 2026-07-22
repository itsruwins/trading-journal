export function formatMoney(value: number, currency: string): string {
  // Losses carry a "−"; gains are bare (color conveys profit). Format the
  // magnitude and sign it ourselves so the minus glyph matches everywhere.
  const sign = value < 0 ? "−" : "";
  try {
    const abs = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      // "$" not "US$" — stay consistent across device locales.
      currencyDisplay: "narrowSymbol",
    }).format(Math.abs(value));
    return `${sign}${abs}`;
  } catch {
    return `${sign}${currency} ${Math.abs(value).toFixed(2)}`;
  }
}

/**
 * Currency for tight spaces: "$400.00", "−$1,250.50", compacting to "$12K"
 * once figures get long. Only losses carry a sign; color conveys profit.
 */
export function formatSignedMoney(
  value: number,
  currency: string,
  compactFrom = 10_000,
): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(abs >= compactFrom
        ? { notation: "compact" as const, maximumFractionDigits: 1 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    }).format(abs);
    return `${sign}${formatted}`;
  } catch {
    return `${sign}${currency} ${abs.toFixed(2)}`;
  }
}

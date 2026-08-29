/**
 * Money is stored in minor units (satang) as integers. Nothing in this code
 * base multiplies or divides currency as a float.
 */

export const DEFAULT_CURRENCY = process.env.PLATFORM_CURRENCY ?? "THB";

export function formatMoney(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency,
    // "฿1,500" rather than "THB 1,500" — the symbol is what appears on a
    // Thai price list, and it keeps prices scannable in a dense table.
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/** Compact form used on cards and in lists: "฿1,500". */
export function formatMoneyShort(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amountMinor / 100));
}

/** Free treatments (a no-charge consultation) are labelled, never shown as "฿0". */
export function formatPriceOrFree(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
  locale = "en",
  freeLabel = "Free",
): string {
  return amountMinor === 0 ? freeLabel : formatMoneyShort(amountMinor, currency, locale);
}

export function percentOf(amountMinor: number, percent: number): number {
  return Math.round((amountMinor * percent) / 100);
}

export function bpsOf(amountMinor: number, bps: number): number {
  return Math.round((amountMinor * bps) / 10_000);
}

function localeTag(locale: string): string {
  if (locale === "th") return "th-TH";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

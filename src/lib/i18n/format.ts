import { INTL_TAG, type Locale } from "@/lib/i18n";
import { PLATFORM_TIMEZONE } from "@/lib/time";

/**
 * Dates, times and numbers are always formatted against the platform timezone
 * (Asia/Bangkok) so that a customer abroad sees the clinic's local time, which
 * is the only time that matters for an appointment.
 */

export function formatDate(
  value: Date | string,
  locale: Locale = "en",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    ...options,
    timeZone: PLATFORM_TIMEZONE,
  }).format(date);
}

export function formatTime(value: Date | string, locale: Locale = "en"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: PLATFORM_TIMEZONE,
  }).format(date);
}

export function formatDateTime(value: Date | string, locale: Locale = "en"): string {
  return `${formatDate(value, locale)} · ${formatTime(value, locale)}`;
}

export function formatWeekday(
  value: Date | string,
  locale: Locale = "en",
  width: "short" | "long" = "short",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    weekday: width,
    timeZone: PLATFORM_TIMEZONE,
  }).format(date);
}

export function formatNumber(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL_TAG[locale]).format(value);
}

export function formatRating(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/** "in 3 days", "2 hours ago" — used sparingly, never for appointment times. */
export function formatRelative(value: Date | string, locale: Locale = "en"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(INTL_TAG[locale], { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return rtf.format(0, "minute");
}

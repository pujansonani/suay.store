/**
 * Timezone helpers.
 *
 * Everything is stored as a UTC instant (`timestamptz`). Schedules, however,
 * are expressed in the clinic's local wall-clock time — "we open at 10:00" is
 * a statement about Bangkok, not about UTC. These helpers convert between the
 * two without pulling in a date library.
 */

export const PLATFORM_TIMEZONE = process.env.PLATFORM_TIMEZONE ?? "Asia/Bangkok";

export const MINUTES_PER_DAY = 1440;

/** `YYYY-MM-DD` in a given timezone. */
export type DateKey = string;

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  dateKey: DateKey;
  /** Minutes elapsed since local midnight. */
  minutes: number;
}

export function zonedParts(instant: Date, timeZone = PLATFORM_TIMEZONE): ZonedParts {
  const parts = formatter(timeZone).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);
  const second = Number(map.second);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek: WEEKDAYS[map.weekday] ?? 0,
    dateKey: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
    minutes: hour * 60 + minute,
  };
}

/** Offset of `timeZone` from UTC, in milliseconds, at the given instant. */
function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convert local wall-clock time to a UTC instant.
 *
 * Resolved in two passes so that the correct offset is used across a DST
 * boundary. Asia/Bangkok has no DST, but the platform should not assume that.
 */
export function zonedTimeToUtc(
  dateKey: DateKey,
  minutesFromMidnight: number,
  timeZone = PLATFORM_TIMEZONE,
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, 0, 0) + minutesFromMidnight * 60_000;
  const firstGuess = new Date(naive - offsetMs(new Date(naive), timeZone));
  return new Date(naive - offsetMs(firstGuess, timeZone));
}

export function dateKeyOf(instant: Date, timeZone = PLATFORM_TIMEZONE): DateKey {
  return zonedParts(instant, timeZone).dateKey;
}

/** Midnight-to-midnight UTC bounds of a local calendar day. */
export function dayBounds(dateKey: DateKey, timeZone = PLATFORM_TIMEZONE): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(dateKey, 0, timeZone),
    end: zonedTimeToUtc(dateKey, MINUTES_PER_DAY, timeZone),
  };
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function dayOfWeekOfKey(dateKey: DateKey): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** `ScheduleException.date` is a DATE column: store it at UTC midnight. */
export function dateKeyToDateColumn(dateKey: DateKey): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateColumnToKey(value: Date): DateKey {
  return `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

/** 570 -> "09:30" */
export function minutesToLabel(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "09:30" -> 570 */
export function labelToMinutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function todayKey(timeZone = PLATFORM_TIMEZONE): DateKey {
  return dateKeyOf(new Date(), timeZone);
}

export function diffInDays(from: DateKey, to: DateKey): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

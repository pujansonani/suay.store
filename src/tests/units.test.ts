import { describe, expect, it } from "vitest";

import { contains, intersect, normalize, overlaps, subtract } from "@/lib/booking/intervals";
import { checkPasswordStrength } from "@/lib/auth/password";
import { formatMoney, formatMoneyShort, formatPriceOrFree, bpsOf, percentOf } from "@/lib/money";
import { getDictionary, interpolate, LOCALES, normalizeLocale } from "@/lib/i18n";
import { en } from "@/lib/i18n/dictionaries/en";
import {
  addDays,
  dateColumnToKey,
  dateKeyToDateColumn,
  dayOfWeekOfKey,
  diffInDays,
  labelToMinutes,
  minutesToLabel,
  zonedParts,
  zonedTimeToUtc,
} from "@/lib/time";
import { slugify, bookingReference, clamp, pluralize } from "@/lib/utils";

describe("interval arithmetic", () => {
  it("merges touching and overlapping intervals", () => {
    expect(normalize([{ start: 60, end: 120 }, { start: 100, end: 180 }])).toEqual([
      { start: 60, end: 180 },
    ]);
    expect(normalize([{ start: 60, end: 120 }, { start: 120, end: 180 }])).toEqual([
      { start: 60, end: 180 },
    ]);
  });

  it("drops empty intervals", () => {
    expect(normalize([{ start: 60, end: 60 }])).toEqual([]);
  });

  it("intersects two sets", () => {
    const result = intersect(
      [{ start: 540, end: 1080 }],
      [{ start: 600, end: 720 }, { start: 900, end: 1200 }],
    );
    expect(result).toEqual([{ start: 600, end: 720 }, { start: 900, end: 1080 }]);
  });

  it("subtracts a period from the middle, splitting the interval", () => {
    expect(subtract([{ start: 540, end: 1080 }], [{ start: 720, end: 780 }])).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1080 },
    ]);
  });

  it("subtracting a covering period leaves nothing", () => {
    expect(subtract([{ start: 600, end: 700 }], [{ start: 500, end: 800 }])).toEqual([]);
  });

  it("knows whether a window is fully contained", () => {
    const open = [{ start: 540, end: 1080 }];
    expect(contains(open, 600, 660)).toBe(true);
    expect(contains(open, 1020, 1140)).toBe(false);
  });

  it("treats intervals as half-open when testing overlap", () => {
    const a1 = new Date("2026-09-01T10:00:00Z");
    const a2 = new Date("2026-09-01T11:00:00Z");
    const b1 = new Date("2026-09-01T11:00:00Z");
    const b2 = new Date("2026-09-01T12:00:00Z");
    // Back-to-back does not overlap...
    expect(overlaps(a1, a2, b1, b2)).toBe(false);
    // ...but a half-hour shift does.
    expect(overlaps(a1, a2, new Date("2026-09-01T10:30:00Z"), b2)).toBe(true);
  });
});

describe("timezone handling", () => {
  it("converts Bangkok wall-clock time to the right UTC instant", () => {
    // Bangkok is UTC+7 year round.
    expect(zonedTimeToUtc("2026-09-01", 10 * 60).toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(zonedTimeToUtc("2026-01-15", 9 * 60 + 30).toISOString()).toBe("2026-01-15T02:30:00.000Z");
  });

  it("round-trips an instant back to local parts", () => {
    const parts = zonedParts(new Date("2026-09-01T03:00:00.000Z"));
    expect(parts.dateKey).toBe("2026-09-01");
    expect(parts.minutes).toBe(600);
    expect(parts.hour).toBe(10);
  });

  it("handles a UTC instant that falls on the previous local day", () => {
    // 23:30 UTC is 06:30 the next morning in Bangkok.
    const parts = zonedParts(new Date("2026-08-31T23:30:00.000Z"));
    expect(parts.dateKey).toBe("2026-09-01");
    expect(parts.minutes).toBe(390);
  });

  it("survives a daylight-saving transition in another zone", () => {
    // London moves its clocks; the helper must resolve the correct offset.
    const before = zonedTimeToUtc("2026-03-28", 12 * 60, "Europe/London");
    const after = zonedTimeToUtc("2026-03-30", 12 * 60, "Europe/London");
    expect(before.toISOString()).toBe("2026-03-28T12:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-30T11:00:00.000Z");
  });

  it("converts minute labels both ways", () => {
    expect(minutesToLabel(570)).toBe("09:30");
    expect(minutesToLabel(0)).toBe("00:00");
    expect(minutesToLabel(1439)).toBe("23:59");
    expect(labelToMinutes("09:30")).toBe(570);
    expect(labelToMinutes("18:00")).toBe(1080);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29"); // leap year
  });

  it("computes weekday and day differences", () => {
    expect(dayOfWeekOfKey("2026-08-30")).toBe(0); // Sunday
    expect(dayOfWeekOfKey("2026-08-31")).toBe(1); // Monday
    expect(diffInDays("2026-08-29", "2026-09-05")).toBe(7);
  });

  it("round-trips a DATE column value", () => {
    expect(dateColumnToKey(dateKeyToDateColumn("2026-09-01"))).toBe("2026-09-01");
  });
});

describe("money", () => {
  it("formats baht with the symbol, from minor units", () => {
    expect(formatMoneyShort(150000)).toBe("฿1,500");
    expect(formatMoney(150000)).toBe("฿1,500");
    expect(formatMoney(150050)).toBe("฿1,500.50");
  });

  it("labels a free treatment rather than showing zero", () => {
    expect(formatPriceOrFree(0)).toBe("Free");
    expect(formatPriceOrFree(150000)).toBe("฿1,500");
  });

  it("computes percentages and basis points as integers", () => {
    expect(percentOf(150000, 50)).toBe(75000);
    expect(bpsOf(150000, 1200)).toBe(18000); // 12%
    // No floating-point residue in the result.
    expect(Number.isInteger(bpsOf(133337, 1234))).toBe(true);
  });
});

describe("password policy", () => {
  it("rejects short passwords", () => {
    expect(checkPasswordStrength("abc1").ok).toBe(false);
  });

  it("requires a letter and a number", () => {
    expect(checkPasswordStrength("password").ok).toBe(false);
    expect(checkPasswordStrength("12345678").ok).toBe(false);
    expect(checkPasswordStrength("Demo1234").ok).toBe(true);
  });
});

describe("internationalisation", () => {
  it("ships all three languages with the same keys as English", () => {
    for (const locale of LOCALES) {
      const dictionary = getDictionary(locale);
      for (const section of Object.keys(en) as (keyof typeof en)[]) {
        expect(Object.keys(dictionary[section])).toEqual(Object.keys(en[section]));
      }
    }
  });

  it("actually translates, rather than falling back to English", () => {
    expect(getDictionary("th").home.heroTitle).not.toBe(en.home.heroTitle);
    expect(getDictionary("ja").home.heroTitle).not.toBe(en.home.heroTitle);
  });

  it("falls back to English for an unknown locale", () => {
    expect(normalizeLocale("de")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale("th")).toBe("th");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(interpolate("Held for {minutes} minutes", { minutes: 10 })).toBe(
      "Held for 10 minutes",
    );
    expect(interpolate("Hello {missing}", {})).toBe("Hello {missing}");
  });
});

describe("utilities", () => {
  it("slugifies clinic names", () => {
    expect(slugify("Aster Medical Clinic")).toBe("aster-medical-clinic");
    expect(slugify("  Nara  Aesthetic — Centre! ")).toBe("nara-aesthetic-centre");
  });

  it("generates references without ambiguous characters", () => {
    for (let i = 0; i < 50; i += 1) {
      const reference = bookingReference();
      expect(reference).toMatch(/^SUAY-[A-HJ-NP-Z2-9]{6}$/);
      // 0/O and 1/I are excluded so a reference can be read aloud.
      expect(reference.slice(5)).not.toMatch(/[01IO]/);
    }
  });

  it("clamps and pluralises", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(pluralize(1, "review")).toBe("review");
    expect(pluralize(2, "review")).toBe("reviews");
  });
});

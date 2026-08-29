import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { th } from "@/lib/i18n/dictionaries/th";

export type Locale = "en" | "th" | "ja";
export type { Dictionary };

export const LOCALES: Locale[] = ["en", "th", "ja"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "suay_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  th: "ไทย",
  ja: "日本語",
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, th, ja };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "th" || value === "ja";
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export const INTL_TAG: Record<Locale, string> = {
  en: "en-US",
  th: "th-TH",
  ja: "ja-JP",
};

/** Fills `{name}` placeholders in a translated string. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}

import "server-only";

import { cookies } from "next/headers";

import { getDictionary, normalizeLocale, type Dictionary, type Locale, LOCALE_COOKIE } from "@/lib/i18n";

/** Reads the visitor's language from the cookie set by the language switcher. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getTranslations(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

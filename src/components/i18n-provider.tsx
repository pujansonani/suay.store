"use client";

import * as React from "react";

import { getDictionary, interpolate, type Dictionary, type Locale } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  /** Fills `{placeholders}` in a translated string. */
  fill: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = React.useMemo<I18nValue>(
    () => ({ locale, t: getDictionary(locale), fill: interpolate }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }
  return context;
}
